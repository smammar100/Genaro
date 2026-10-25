import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { makeVehicle } from "@/test/factories";
import type { Lead, LeadChannel, User } from "@/lib/types";
import { EditLeadModal } from "./edit-lead-modal";

const lead = {
  id: "lead-0001",
  companyId: "co-0001",
  customerName: "Rajesh Kumar",
  customerPhone: "07949 912170",
  customerEmail: null,
  vehicleInterest: "VOLKSWAGEN POLO (AV11 NLZ)",
  vehicleId: "veh-0001",
  source: "walk_in",
  leadChannelId: "ch-walkin",
  status: "new",
  assignedTo: "user-1",
  notes: null,
  appointmentId: null,
  createdAt: "2026-10-23T10:00:00Z",
} as unknown as Lead;

const channels = [
  { id: "ch-walkin", slug: "walk_in", label: "Walk-in" },
  { id: "ch-phone", slug: "phone", label: "Phone" },
] as unknown as LeadChannel[];
const users = [
  { id: "user-1", name: "Sikander Jaffery" },
  { id: "user-2", name: "Abbas Jaffery" },
] as unknown as User[];
const polo = makeVehicle({ id: "veh-0001", registration: "AV11 NLZ", make: "VOLKSWAGEN", model: "POLO" });

const renderModal = (onSave = vi.fn(async () => undefined)) => {
  render(
    <EditLeadModal
      open
      onClose={() => undefined}
      lead={lead}
      vehicle={polo}
      vehicles={[polo]}
      channels={channels}
      users={users}
      onSave={onSave}
    />,
  );
  return onSave;
};

describe("EditLeadModal", () => {
  it("opens on the lead as it is", () => {
    renderModal();
    expect(screen.getByLabelText("Name")).toHaveValue("Rajesh Kumar");
    expect(screen.getByLabelText("Phone")).toHaveValue("07949 912170");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Vehicle interest")).toHaveValue("VOLKSWAGEN POLO (AV11 NLZ)");
  });

  it("saves every edited field", async () => {
    const onSave = renderModal();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Rajesh Kumar Singh " } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "rajesh@example.co.uk" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Prefers weekends" } });
    fireEvent.click(screen.getByRole("button", { name: "Save lead" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith({
      customerName: "Rajesh Kumar Singh",
      customerPhone: "07949 912170",
      customerEmail: "rajesh@example.co.uk",
      vehicle: polo,
      vehicleInterest: "VOLKSWAGEN POLO (AV11 NLZ)",
      leadChannelId: "ch-walkin",
      assignedTo: "user-1",
      notes: "Prefers weekends",
    });
  });

  it("won't save a phone number that isn't a UK one", async () => {
    const onSave = renderModal();
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save lead" }));
    expect(await screen.findByText(/Enter a valid UK phone number/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows why a save failed and stays open", async () => {
    renderModal(vi.fn(async () => { throw new Error("This lead has an open deal, so it needs a vehicle."); }));
    fireEvent.click(screen.getByRole("button", { name: "Save lead" }));
    expect(await screen.findByText("This lead has an open deal, so it needs a vehicle.")).toBeInTheDocument();
  });
});
