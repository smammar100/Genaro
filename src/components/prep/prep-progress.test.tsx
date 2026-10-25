import { describe, expect, it } from "vitest";
import type { PrepCar } from "@/lib/services/prep-service";
import type { TodoItem, TodoStatus, Vehicle } from "@/lib/types";
import { openTodos, prepBreakdown, withTodoStatus } from "./prep-progress";

const todo = (id: string, status: TodoStatus): TodoItem => ({
  id,
  vehicleId: "v1",
  serialNumber: 1,
  description: `Job ${id}`,
  vendorId: null,
  status,
  cost: null,
  source: "manual",
  createdBy: "u1",
  completedBy: null,
  completedAt: null,
  createdAt: "2026-10-20T09:00:00Z",
});

const car = (todos: TodoItem[]): PrepCar =>
  withTodoStatus(
    {
      vehicle: { id: "v1" } as Vehicle,
      status: "in_progress",
      todos,
      open: 0,
      pending: 0,
      inProgress: 0,
      cancelled: 0,
      done: 0,
      total: todos.length,
      cost: 0,
      daysWaiting: 6,
    },
    "",
    "pending",
  );

describe("openTodos", () => {
  it("lists started jobs before ones not started, and leaves done and cancelled out", () => {
    const c = car([
      todo("a", "pending"),
      todo("b", "completed"),
      todo("c", "in_progress"),
      todo("d", "cancelled"),
      todo("e", "pending"),
    ]);
    expect(openTodos(c).map((t) => t.id)).toEqual(["c", "a", "e"]);
  });
});

describe("withTodoStatus", () => {
  it("rolls the counts up again after a tick", () => {
    const ticked = withTodoStatus(
      car([todo("a", "pending"), todo("b", "in_progress"), todo("c", "completed")]),
      "b",
      "completed",
    );
    expect(ticked.todos.find((t) => t.id === "b")?.status).toBe("completed");
    expect(ticked).toMatchObject({ done: 2, inProgress: 0, pending: 1, open: 1, total: 3 });
  });

  it("puts an unticked job back to not started", () => {
    const unticked = withTodoStatus(car([todo("a", "completed")]), "a", "pending");
    expect(unticked).toMatchObject({ done: 0, pending: 1, open: 1 });
  });
});

describe("prepBreakdown", () => {
  it("says how many jobs are done, in progress and not started", () => {
    expect(prepBreakdown({ done: 3, inProgress: 1, pending: 1, cancelled: 0 })).toBe(
      "3 done · 1 in progress · 1 not started",
    );
  });

  it("adds cancelled jobs only when there are some", () => {
    expect(prepBreakdown({ done: 0, inProgress: 0, pending: 2, cancelled: 1 })).toBe(
      "0 done · 0 in progress · 2 not started · 1 cancelled",
    );
  });
});
