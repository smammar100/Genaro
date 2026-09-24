/**
 * Master sheet BB — TOTAL VALUE ADDITION is the roll-up of a car's Things to
 * Do costs (docs/master-sheet-spec.md). These pin the service that keeps the
 * stored figure, and the totals that include it, in step.
 */
import { describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  stepArgs,
  type SupabaseMock,
} from "@/test/supabase-mock";
import { makeVehicle } from "@/test/factories";
import type { Vehicle } from "@/lib/types";
import { computeCostTotals, costInputsOf } from "@/lib/vehicle-costs";

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

import { vehicleService } from "./vehicle-service";

/** The vehicle the reads return, and the to-dos behind it. */
function seed(vehicle: Vehicle, todos: { cost: number | null; status: string }[]) {
  db.current = createSupabaseMock((call) => {
    if (call.table === "todo_items") return { data: todos, error: null };
    if (call.table === "vehicles") {
      const update = stepArgs(call, "update")?.[0] as Record<string, unknown> | undefined;
      // An update echoes the patched row back, as .select().single() would.
      return { data: update ? { ...vehicle, ...camel(update) } : vehicle, error: null };
    }
    return undefined;
  });
}

/** Enough snake→camel for the columns these tests read back. */
function camel(row: Record<string, unknown>): Partial<Vehicle> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.replace(/_(\w)/g, (_, c) => c.toUpperCase()), v]),
  );
}

const updates = () =>
  db.current.calls
    .filter((c) => c.table === "vehicles" && stepArgs(c, "update"))
    .map((c) => stepArgs(c, "update")![0] as Record<string, unknown>);

describe("recomputeValueAddition", () => {
  it("re-sums the Things to Do costs, skipping cancelled items", async () => {
    seed(makeVehicle({ valueAddition: 0, legacySerialNumber: null }), [
      { cost: 120, status: "completed" },
      { cost: 30, status: "pending" },
      { cost: 999, status: "cancelled" },
    ]);
    await vehicleService.recomputeValueAddition("veh-0001", "user-1");
    expect(updates()).toHaveLength(1);
    expect(updates()[0].value_addition).toBe(150);
  });

  it("re-derives the stored totals in the same write", async () => {
    const v = makeVehicle({ valueAddition: 0, legacySerialNumber: null });
    seed(v, [{ cost: 100, status: "completed" }]);
    await vehicleService.recomputeValueAddition("veh-0001", "user-1");
    const patch = updates()[0];
    const before = computeCostTotals(costInputsOf(v));
    expect(patch.landed_cost).toBe(before.landedCost + 100);
    expect(patch.base_cost).toBe(before.baseCost + 100);
    // Value addition sits below TOTAL BUYING PRICE — AI must not move.
    expect(patch.total_buying_price).toBe(before.totalBuyingPrice);
  });

  it("never touches a legacy car's imported figure", async () => {
    seed(makeVehicle({ valueAddition: 695, legacySerialNumber: 3 }), [
      { cost: 10, status: "completed" },
    ]);
    await vehicleService.recomputeValueAddition("veh-0001", "user-1");
    expect(updates()).toHaveLength(0);
  });

  it("writes nothing when the sum hasn't changed", async () => {
    seed(makeVehicle({ valueAddition: 45.5, legacySerialNumber: null }), [
      { cost: 45.5, status: "in_progress" },
    ]);
    await vehicleService.recomputeValueAddition("veh-0001", "user-1");
    expect(updates()).toHaveLength(0);
  });
});

describe("getAll", () => {
  // PostgREST caps a response at 1,000 rows; the legacy import alone is ~1,900.
  it("pages past the 1,000-row cap until a short page", async () => {
    const all = Array.from({ length: 1005 }, (_, i) => ({ id: `v-${i}` }));
    db.current = createSupabaseMock((call) => {
      if (call.table !== "vehicles") return undefined;
      const [from, to] = stepArgs(call, "range") as [number, number];
      return { data: all.slice(from, to + 1), error: null };
    });
    const rows = await vehicleService.getAll("co-paged");
    expect(rows).toHaveLength(1005);
    const ranges = db.current.calls
      .filter((c) => c.table === "vehicles")
      .map((c) => stepArgs(c, "range"));
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("makes one request when everything fits", async () => {
    db.current = createSupabaseMock((call) =>
      call.table === "vehicles" ? { data: [{ id: "a" }], error: null } : undefined,
    );
    expect(await vehicleService.getAll("co-small")).toHaveLength(1);
    expect(db.current.calls.filter((c) => c.table === "vehicles")).toHaveLength(1);
  });
});

describe("create", () => {
  it("fills the master sheet fields a caller leaves out, as AVAILABLE", async () => {
    db.current = createSupabaseMock((call) => {
      if (call.table === "rpc:next_stock_seq") return { data: "CC-0100", error: null };
      if (call.table === "vehicles") return { data: makeVehicle(), error: null };
      if (call.table === "maintenance_jobs") return { data: { id: "job-1" }, error: null };
      return undefined;
    });
    const {
      id: _id,
      stockId: _s,
      createdAt: _c,
      updatedAt: _u,
      saleStatus: _ss,
      legacySerialNumber: _l,
      ...input
    } = makeVehicle();
    void [_id, _s, _c, _u, _ss, _l];
    await vehicleService.create(input, "user-1");
    const insert = db.current.calls.find((c) => c.table === "vehicles" && stepArgs(c, "insert"));
    expect(stepArgs(insert!, "insert")?.[0]).toMatchObject({
      sale_status: "available",
      legacy_serial_number: null,
      stock_id: "CC-0100",
    });
  });
});
