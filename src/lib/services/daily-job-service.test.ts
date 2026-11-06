/** Daily jobs: what the service writes when a job is posted or reassigned (0064). */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, stepArgs, type SupabaseMock } from "@/test/supabase-mock";

const db = { current: null as unknown as SupabaseMock };
vi.mock("@/lib/supabase/client", () => ({ createClient: () => db.current.client }));
vi.mock("@/lib/cache", () => ({ withCache: (_k: string, fn: () => unknown) => fn(), invalidate: vi.fn() }));

import { dailyJobService } from "./daily-job-service";

const saved = { id: "job-1", assignedTo: "user-raza" };
beforeEach(() => {
  db.current = createSupabaseMock(() => ({ data: saved, error: null }));
});

const written = (method: "insert" | "update") =>
  stepArgs(db.current.calls.find((c) => c.steps.some((s) => s.method === method))!, method)?.[0];

const post = {
  companyId: "co-0001",
  jobDate: "2026-11-06",
  title: "  Take LS68 NYY to the car wash ",
  registration: "ls68nyy",
  priority: "normal" as const,
  createdBy: "user-abbas",
};

describe("dailyJobService.add", () => {
  it("saves the job for the staff member it was assigned to", async () => {
    await dailyJobService.add({ ...post, assignedTo: "user-raza" });
    expect(written("insert")).toEqual({
      company_id: "co-0001",
      job_date: "2026-11-06",
      title: "Take LS68 NYY to the car wash",
      registration: "LS68 NYY",
      priority: "normal",
      created_by: "user-abbas",
      assigned_to: "user-raza",
    });
  });

  it("leaves a job open when nobody is chosen", async () => {
    await dailyJobService.add({ ...post, assignedTo: null });
    expect(written("insert")).toMatchObject({ assigned_to: null });
  });

  it("leaves a job open when the caller doesn't say", async () => {
    await dailyJobService.add(post);
    expect(written("insert")).toMatchObject({ assigned_to: null });
  });

  it("reads the assignee back with the saved job", async () => {
    const job = await dailyJobService.add({ ...post, assignedTo: "user-raza" });
    expect(job).toEqual(saved);
    const select = stepArgs(db.current.calls[0], "select")?.[0] as string;
    expect(select).toContain("assignedTo:assigned_to");
  });
});

describe("dailyJobService.assign", () => {
  it("gives the job to a staff member, changing nothing else", async () => {
    await dailyJobService.assign("job-1", "user-sikander");
    expect(written("update")).toEqual({ assigned_to: "user-sikander" });
    expect(stepArgs(db.current.calls[0], "eq")).toEqual(["id", "job-1"]);
  });

  it("opens the job to anyone again", async () => {
    await dailyJobService.assign("job-1", null);
    expect(written("update")).toEqual({ assigned_to: null });
  });

  it("says so when the save fails", async () => {
    db.current = createSupabaseMock(() => ({ data: null, error: { message: "permission denied" } }));
    await expect(dailyJobService.assign("job-1", null)).rejects.toMatchObject({ message: "permission denied" });
  });
});

describe("dailyJobService.getForDay", () => {
  it("reads who each job is assigned to", async () => {
    db.current = createSupabaseMock(() => ({ data: [], error: null }));
    await dailyJobService.getForDay("co-0001", "2026-11-06");
    expect(stepArgs(db.current.calls[0], "select")?.[0]).toContain("assignedTo:assigned_to");
  });
});
