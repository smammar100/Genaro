import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { makeSalesDeal, makeVehicle } from "@/test/factories";
import type { MaintenanceJob } from "@/lib/types";

const actions = vi.hoisted(() => ({
  createEvent: vi.fn(async () => undefined),
  updateEvent: vi.fn(async () => undefined),
}));
vi.mock("./event-actions", () => actions);

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    company: { id: "co-0001", workingHoursStart: "08:00", workingHoursEnd: "18:00" },
    user: { id: "user-9" },
  }),
}));

vi.mock("@/lib/toast", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { QuickBookModal } from "./quick-book-modal";
import { todayKey } from "@/components/kanban/card-dates";

const car = makeVehicle({ id: "veh-0001", registration: "AB12 CDE" });

function job(overrides: Partial<MaintenanceJob> = {}): MaintenanceJob {
  return {
    id: "job-0001",
    companyId: "co-0001",
    vehicleId: "veh-0001",
    description: "Cambelt change",
    dueDate: null,
    scheduledTime: null,
    notes: "Customer waiting",
    ...overrides,
  } as MaintenanceJob;
}

const submit = () =>
  fireEvent.click(screen.getAllByRole("button", { name: "Book appointment" }).at(-1)!);

beforeEach(() => {
  actions.createEvent.mockClear();
  actions.updateEvent.mockClear();
});

describe("QuickBookModal — from a sales deal", () => {
  it("fills the customer and car from the card and books at 09:00 today", async () => {
    const onBooked = vi.fn();
    render(
      <QuickBookModal
        booking={{ kind: "appt", deal: makeSalesDeal() }}
        vehicles={[car]}
        onClose={() => undefined}
        onBooked={onBooked}
      />,
    );

    expect(screen.getByLabelText("Customer name")).toHaveValue("Sarah Whitfield");
    expect(screen.getByLabelText("Phone")).toHaveValue("07700 900123");
    expect(screen.getByLabelText("Email")).toHaveValue("sarah@example.co.uk");

    submit();
    await waitFor(() => expect(actions.createEvent).toHaveBeenCalled());
    expect(actions.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "appt",
        customerName: "Sarah Whitfield",
        vehicleId: "veh-0001",
        date: todayKey(),
        time: "09:00",
      }),
      // The appointment links back to the deal's lead.
      { companyId: "co-0001", userId: "user-9", leadId: "lead-0001" },
    );
    expect(onBooked).toHaveBeenCalled();
  });
});

describe("QuickBookModal — from a maintenance job", () => {
  it("books the job itself into a slot rather than creating another", async () => {
    render(
      <QuickBookModal
        booking={{ kind: "maint", job: job() }}
        vehicles={[car]}
        onClose={() => undefined}
        onBooked={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Job")).toHaveValue("Cambelt change");

    submit();
    await waitFor(() => expect(actions.updateEvent).toHaveBeenCalled());
    expect(actions.createEvent).not.toHaveBeenCalled();
    expect(actions.updateEvent).toHaveBeenCalledWith(
      { kind: "maint", id: "job-0001", scheduledTime: null },
      expect.objectContaining({
        description: "Cambelt change",
        vehicleId: "veh-0001",
        date: todayKey(),
        time: "09:00",
        notes: "Customer waiting",
      }),
      "user-9",
    );
  });

  it("keeps a due date and time the job already has", async () => {
    render(
      <QuickBookModal
        booking={{ kind: "maint", job: job({ dueDate: "2099-01-15", scheduledTime: "14:30:00" }) }}
        vehicles={[car]}
        onClose={() => undefined}
        onBooked={() => undefined}
      />,
    );
    submit();
    await waitFor(() => expect(actions.updateEvent).toHaveBeenCalled());
    expect(actions.updateEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ date: "2099-01-15", time: "14:30" }),
      "user-9",
    );
  });

  it("moves an overdue job to today", async () => {
    render(
      <QuickBookModal
        booking={{ kind: "maint", job: job({ dueDate: "2020-01-01" }) }}
        vehicles={[car]}
        onClose={() => undefined}
        onBooked={() => undefined}
      />,
    );
    submit();
    await waitFor(() => expect(actions.updateEvent).toHaveBeenCalled());
    expect(actions.updateEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ date: todayKey() }),
      "user-9",
    );
  });
});

it("renders nothing until there's something to book", () => {
  const { container } = render(
    <QuickBookModal booking={null} vehicles={[]} onClose={() => undefined} onBooked={() => undefined} />,
  );
  expect(container).toBeEmptyDOMElement();
});
