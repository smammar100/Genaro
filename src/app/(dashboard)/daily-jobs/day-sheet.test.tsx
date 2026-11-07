/** Daily jobs: assigning a job when it's posted, and from its row (request 2026-11-06, migration 0064). */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { DailyJob, User } from "@/lib/types";

// The same objects every render, as the real auth context gives: a new
// company each time would make the sheet reload its jobs forever.
const auth = vi.hoisted(() => ({ user: { id: "user-abbas" }, company: { id: "co-0001" } }));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }));
const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), toastMock) }));

const people = [
  { id: "user-sikander", name: "Sikander Jaffery", active: true },
  { id: "user-raza", name: "Raza Jafri", active: true },
  { id: "user-abbas", name: "Abbas Jaffery", active: true },
  { id: "user-left", name: "Zara Former", active: false },
] as unknown as User[];
vi.mock("@/lib/services/auth-service", () => ({
  authService: { getUsersForCompany: vi.fn(async () => people) },
}));

const svc = vi.hoisted(() => ({
  getForDay: vi.fn(),
  add: vi.fn(),
  assign: vi.fn(),
  setPriority: vi.fn(),
  pickUp: vi.fn(),
  complete: vi.fn(),
  reopen: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/services/daily-job-service", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/services/daily-job-service")>()),
  dailyJobService: svc,
}));

import { DaySheet } from "./day-sheet";

const job = (o: Partial<DailyJob>): DailyJob => ({
  id: "job",
  companyId: "co-0001",
  jobDate: "2026-11-06",
  title: "A job",
  registration: null,
  priority: "normal",
  status: "pending",
  createdBy: "user-raza",
  assignedTo: null,
  pickedUpBy: null,
  pickedUpAt: null,
  completedBy: null,
  completedAt: null,
  createdAt: "2026-11-06T09:00:00Z",
  ...o,
});
const wash = job({ id: "job-wash", title: "Take LS68 NYY to the car wash", createdAt: "2026-11-06T09:00:00Z" });
const mot = job({ id: "job-mot", title: "Drop the Corsa for its MOT", assignedTo: "user-sikander", createdAt: "2026-11-06T09:10:00Z" });
const done = job({
  id: "job-done",
  title: "Drop car to Khan",
  assignedTo: "user-raza",
  status: "completed",
  completedBy: "user-raza",
  completedAt: "2026-11-06T11:00:00Z",
});

beforeEach(() => {
  vi.clearAllMocks();
  svc.getForDay.mockResolvedValue([wash, mot, done]);
  svc.add.mockImplementation(async (input: { title: string; assignedTo?: string | null }) =>
    job({ id: "job-new", title: input.title, assignedTo: input.assignedTo ?? null, createdBy: "user-abbas" }),
  );
  svc.assign.mockImplementation(async (id: string, to: string | null) =>
    ({ ...[wash, mot, done].find((j) => j.id === id)!, assignedTo: to }),
  );
});

const rowFor = (title: string) => screen.getByText(title).closest("tr") as HTMLTableRowElement;
/** One cell of a job's row, by its column's heading. */
function cell(title: string, column: string): HTMLElement {
  const headings = screen.getAllByRole("columnheader").map((h) => h.textContent?.trim());
  return rowFor(title).cells[headings.indexOf(column)];
}
/** The Add job modal, opened from the page header's Add job. */
const dialog = () => screen.getByRole("dialog", { name: "Add job" });
const openAddJob = () => fireEvent.click(screen.getByRole("button", { name: "Add job" }));
const assignField = () => within(dialog()).getByRole("combobox", { name: "Assign to" });

async function renderSheet() {
  render(<DaySheet />);
  await screen.findByText(mot.title);
  // Staff load alongside the jobs; names appear once they're in.
  await waitFor(() => expect(cell(mot.title, "Assigned to")).toHaveTextContent("Sikander"));
}

describe("posting a job", () => {
  it("offers Open first, then active staff by name; anyone who has left isn't offered", async () => {
    await renderSheet();
    openAddJob();
    expect(assignField()).toHaveTextContent("Open (unassigned)");
    fireEvent.click(assignField());
    // What's read out: the avatars beside the names are hidden as decoration.
    const spoken = (el: HTMLElement) => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("[aria-hidden]").forEach((n) => n.remove());
      return copy.textContent?.trim();
    };
    expect(screen.getAllByRole("option").map(spoken)).toEqual([
      "Open (unassigned)",
      "Abbas Jaffery",
      "Raza Jafri",
      "Sikander Jaffery",
    ]);
    expect(screen.getByRole("option", { name: "Raza Jafri" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Zara/ })).toBeNull();
  });

  it("posts an open job when nobody is chosen", async () => {
    await renderSheet();
    openAddJob();
    fireEvent.change(within(dialog()).getByLabelText("Job"), { target: { value: "Collect the Astra" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Add job" }));
    await waitFor(() => expect(svc.add).toHaveBeenCalled());
    expect(svc.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Collect the Astra", assignedTo: null, createdBy: "user-abbas" }),
    );
  });

  it("posts a job for the staff member chosen, then starts the next one open again", async () => {
    await renderSheet();
    openAddJob();
    fireEvent.change(within(dialog()).getByLabelText("Job"), { target: { value: "Collect the Astra" } });
    fireEvent.click(assignField());
    fireEvent.click(screen.getByRole("option", { name: "Raza Jafri" }));
    expect(assignField()).toHaveTextContent("Raza Jafri");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Add job" }));
    await waitFor(() => expect(svc.add).toHaveBeenCalledWith(expect.objectContaining({ assignedTo: "user-raza" })));
    // The new job lands on the sheet, for Raza, and the modal closes.
    await waitFor(() => expect(cell("Collect the Astra", "Assigned to")).toHaveTextContent("Raza"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add job" })).toBeNull());
    // The next one starts open again.
    openAddJob();
    expect(assignField()).toHaveTextContent("Open (unassigned)");
  });

  it("posts with Enter from the job field", async () => {
    await renderSheet();
    openAddJob();
    const field = within(dialog()).getByLabelText("Job");
    fireEvent.change(field, { target: { value: "Wash the Corsa" } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(svc.add).toHaveBeenCalledWith(expect.objectContaining({ title: "Wash the Corsa" })));
  });
});

describe("the Assigned to column", () => {
  it("shows who each job is for, or Open", async () => {
    await renderSheet();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent?.trim())).toEqual([
      "Job",
      "Priority",
      "Posted by",
      "Assigned to",
      "Status",
      "Action",
    ]);
    expect(within(cell(wash.title, "Assigned to")).getByRole("button", { name: /Assigned to: nobody, open to anyone/ })).toHaveTextContent("Open");
    expect(within(cell(mot.title, "Assigned to")).getByRole("button", { name: /Assigned to: Sikander Jaffery/ })).toHaveTextContent("Sikander");
  });

  it("a finished job just says who it was for, with nothing to change", async () => {
    await renderSheet();
    expect(cell(done.title, "Assigned to")).toHaveTextContent("Raza");
    expect(within(rowFor(done.title)).queryByRole("button", { name: /Assigned to/ })).toBeNull();
  });

  it("gives an open job to someone from its row", async () => {
    await renderSheet();
    fireEvent.click(within(rowFor(wash.title)).getByRole("button", { name: /Assigned to/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Raza Jafri" }));
    expect(svc.assign).toHaveBeenCalledWith("job-wash", "user-raza");
    await waitFor(() => expect(within(rowFor(wash.title)).getByRole("button", { name: /Assigned to: Raza Jafri/ })).toBeInTheDocument());
  });

  it("opens an assigned job to anyone again", async () => {
    await renderSheet();
    fireEvent.click(within(rowFor(mot.title)).getByRole("button", { name: /Assigned to/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open (unassigned)" }));
    expect(svc.assign).toHaveBeenCalledWith("job-mot", null);
    await waitFor(() => expect(within(rowFor(mot.title)).getByRole("button", { name: /open to anyone/ })).toHaveTextContent("Open"));
  });

  it("puts it back and says so when the change can't be saved", async () => {
    svc.assign.mockRejectedValueOnce(new Error("offline"));
    await renderSheet();
    fireEvent.click(within(rowFor(mot.title)).getByRole("button", { name: /Assigned to/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Raza Jafri" }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Couldn't change who the job is assigned to."));
    expect(within(rowFor(mot.title)).getByRole("button", { name: /Assigned to: Sikander Jaffery/ })).toBeInTheDocument();
  });

  it("assigning doesn't pick the job up: it's still there for anyone to pick up", async () => {
    await renderSheet();
    const row = rowFor(mot.title);
    expect(within(row).getByText("Pending")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Pick up/ })).toBeInTheDocument();
  });
});
