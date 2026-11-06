import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { makeVehicle } from "@/test/factories";
import type { LeadChannel, User } from "@/lib/types";
import { CreateLeadModal, failureMessage, type NewLead } from "./create-lead-modal";

vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const DRAFT = "carcap:lead-draft:test";

const channels = [
  { id: "ch-cargurus", slug: "cargurus", label: "CarGurus" },
  { id: "ch-walkin", slug: "walk_in", label: "Walk-in" },
] as unknown as LeadChannel[];
const users = [{ id: "user-1", name: "Sikander Jaffery" }] as unknown as User[];
const focus = makeVehicle({ id: "veh-0129", registration: "VE63 BWO", make: "FORD", model: "FOCUS" });

/** Daniel's lead from the 6 Nov screenshots, restored as a draft so the form is complete. */
function renderWithLead(onCreate: (lead: NewLead) => Promise<void>) {
  localStorage.setItem(
    DRAFT,
    JSON.stringify({
      customerName: "Daniel",
      customerPhone: "07464 969575",
      customerEmail: "",
      vehicleId: "veh-0129",
      leadType: "viewing",
      leadChannelId: "ch-cargurus",
      channelOtherReason: "",
      assignedTo: "user-1",
      notes: "",
    }),
  );
  render(
    <CreateLeadModal
      open
      onClose={() => undefined}
      vehicles={[focus]}
      channels={channels}
      users={users}
      draftKey={DRAFT}
      onCreate={onCreate}
    />,
  );
}

const submit = async () => {
  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Daniel"));
  fireEvent.click(screen.getByRole("button", { name: "Create lead" }));
};

beforeEach(() => localStorage.clear());

describe("CreateLeadModal", () => {
  it("hands over a CarGurus lead on the chosen car", async () => {
    const onCreate = vi.fn(async () => undefined);
    renderWithLead(onCreate);
    await submit();
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: "Daniel",
        customerPhone: "07464 969575",
        customerEmail: null,
        vehicle: focus,
        vehicleInterest: "FORD FOCUS (VE63 BWO)",
        leadChannelId: "ch-cargurus",
        assignedTo: "user-1",
      }),
    );
  });

  it("shows the database's reason when Supabase rejects the save", async () => {
    // supabase-js rejects with a plain object, not an Error: the shape that
    // used to collapse into a bare "Couldn't create the lead."
    renderWithLead(async () => {
      throw {
        code: "23514",
        message: 'new row for relation "leads" violates check constraint "leads_source_check"',
        details: null,
        hint: null,
      };
    });
    await submit();
    expect(
      await screen.findByText(
        `Couldn't create the lead: new row for relation "leads" violates check constraint "leads_source_check"`,
      ),
    ).toBeInTheDocument();
  });

  it("shows an Error's own message", async () => {
    renderWithLead(async () => {
      throw new Error("This car is already reserved for Faysal Ahmed. Mark their deal lost first.");
    });
    await submit();
    expect(
      await screen.findByText("This car is already reserved for Faysal Ahmed. Mark their deal lost first."),
    ).toBeInTheDocument();
  });
});

describe("failureMessage", () => {
  it.each([
    [new Error("Network down"), "Network down"],
    [{ message: "permission denied for table leads" }, "Couldn't create the lead: permission denied for table leads"],
    [{ message: "" }, "Couldn't create the lead."],
    [{ code: "500" }, "Couldn't create the lead."],
    ["boom", "Couldn't create the lead."],
    [null, "Couldn't create the lead."],
    [undefined, "Couldn't create the lead."],
  ])("%o → %s", (thrown, expected) => {
    expect(failureMessage(thrown)).toBe(expected);
  });
});
