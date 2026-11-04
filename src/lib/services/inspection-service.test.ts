/**
 * Bug list 2026-11-04: resetting an inspection cleared its answers but left
 * the Things to Do items (and jobs) it had raised. These pin the reset — which
 * is `start()` run again — clearing the open ones and keeping finished work.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  stepArgs,
  type QueryCall,
  type SupabaseMock,
  type SupabaseResult,
} from "@/test/supabase-mock";
import { makeVehicle } from "@/test/factories";

const db = { current: null as unknown as SupabaseMock };

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => db.current.client,
}));
vi.mock("@/lib/cache", () => ({
  withCache: (_k: string, fn: () => unknown) => fn(),
  invalidate: vi.fn(),
}));
vi.mock("./activity-service", () => ({
  activityService: { log: vi.fn(async () => undefined) },
}));
vi.mock("./vehicle-service", () => ({
  vehicleService: { getById: vi.fn(async () => makeVehicle()) },
}));
vi.mock("./todo-service", () => ({ todoService: { add: vi.fn() } }));
vi.mock("./maintenance-service", () => ({
  maintenanceService: { create: vi.fn() },
}));
vi.mock("./inspection-checklist-service", () => ({
  inspectionChecklistService: {
    getAll: vi.fn(async () => [
      { number: 1, item: "Tyres" },
      { number: 2, item: "Brakes" },
    ]),
  },
}));

import { inspectionService } from "./inspection-service";

const isDelete = (c: QueryCall) => c.steps.some((s) => s.method === "delete");
const isInsert = (c: QueryCall) => c.steps.some((s) => s.method === "insert");
const deleteOf = (table: string) =>
  db.current.calls.find((c) => c.table === table && isDelete(c));

/** Every query succeeds unless `fail` answers for it. */
function seed(fail?: (call: QueryCall) => SupabaseResult | undefined) {
  db.current = createSupabaseMock((call) => {
    const failed = fail?.(call);
    if (failed) return failed;
    // The "is anything left?" check after clearing the old answers.
    if (call.table === "inspection_checks" && stepArgs(call, "select")?.[1]) {
      return { data: null, error: null, count: 0 };
    }
    return { data: [], error: null };
  });
}

beforeEach(() => seed());

describe("start (Reset)", () => {
  it("clears the open Things to Do items the inspection raised", async () => {
    await inspectionService.start("veh-0001", "user-9");
    const todos = deleteOf("todo_items");
    expect(todos).toBeDefined();
    expect(todos!.steps).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["vehicle_id", "veh-0001"] },
        // Manual items are the user's own: only inspection ones go.
        { method: "eq", args: ["source", "inspection"] },
        // Completed (and cancelled) items stay as the record of work done.
        { method: "in", args: ["status", ["pending", "in_progress"]] },
      ]),
    );
  });

  it("clears the unfinished jobs the inspection created", async () => {
    await inspectionService.start("veh-0001", "user-9");
    const jobs = deleteOf("maintenance_jobs");
    expect(jobs).toBeDefined();
    expect(jobs!.steps).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["vehicle_id", "veh-0001"] },
        { method: "neq", args: ["status", "completed"] },
        { method: "like", args: ["notes", "Auto-created from 20-point inspection%"] },
      ]),
    );
  });

  it("clears the old actions before writing the fresh checklist", async () => {
    await inspectionService.start("veh-0001", "user-9");
    const calls = db.current.calls;
    const insertAt = calls.findIndex(
      (c) => c.table === "inspection_checks" && isInsert(c),
    );
    expect(insertAt).toBeGreaterThan(-1);
    expect(calls.indexOf(deleteOf("todo_items")!)).toBeLessThan(insertAt);
    expect(calls.indexOf(deleteOf("maintenance_jobs")!)).toBeLessThan(insertAt);
    const rows = stepArgs(calls[insertAt], "insert")?.[0] as unknown[];
    expect(rows).toHaveLength(2);
  });

  it("stops, with the checklist untouched, when the items can't be cleared", async () => {
    seed((call) =>
      call.table === "todo_items" && isDelete(call)
        ? { data: null, error: new Error("permission denied") }
        : undefined,
    );
    await expect(inspectionService.start("veh-0001", "user-9")).rejects.toThrow(
      "permission denied",
    );
    expect(
      db.current.calls.some((c) => c.table === "inspection_checks" && isInsert(c)),
    ).toBe(false);
  });
});
