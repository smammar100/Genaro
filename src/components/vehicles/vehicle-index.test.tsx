/** All vehicles (Compact, docs/vehicles.md): the columns, the In stock and MOT cells, search, Move. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Vehicle } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/vehicles",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ company: { id: "co-1" }, user: { id: "u-1" } }) }));
const perms = vi.hoisted(() => ({ move: true }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ isSuperUser: false, can: (c: string) => (c === "locations:move" ? perms.move : false) }),
}));
vi.mock("@/hooks/use-company-locations", () => ({
  useCompanyLocations: () => [],
  // Every built-in place in use, none removed in Settings.
  useBuiltInLocations: () => ["forecourt", "yard", "garage", "staff", "courtesy_car"],
}));
vi.mock("@/lib/services/vendor-service", () => ({ vendorService: { getAll: vi.fn(async () => []) } }));
vi.mock("@/lib/services/team-service", () => ({ teamService: { getAll: vi.fn(async () => []) } }));
const stock = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("@/lib/services/vehicle-service", () => ({ vehicleService: { getAll: vi.fn(async () => stock.list) } }));

import { VehicleIndex, VehicleSearch } from "./vehicle-index";

const car = (o: Partial<Vehicle>): Vehicle =>
  ({
    id: "v",
    registration: "EK70 RXZ",
    stockId: "CC-0130",
    make: "VAUXHALL",
    model: "ASTRA",
    year: 2020,
    fuelType: "petrol",
    transmission: "manual",
    mileage: 33800,
    status: "received",
    saleStatus: "available",
    currentLocation: "forecourt",
    outForTestDrive: false,
    testDriveExpectedBackAt: null,
    motExpiry: "2027-06-27",
    receivedDate: "2026-11-04",
    createdAt: "2026-11-04T09:00:00Z",
    daysInStock: 2,
    ...o,
  }) as Vehicle;

beforeEach(() => {
  perms.move = true;
  stock.list = [
    car({ id: "a", registration: "EK70 RXZ", status: "reserved", daysInStock: 14, motExpiry: "2020-01-01" }),
    car({ id: "b", registration: "VE63 BWO", make: "FORD", model: "FOCUS", year: 2014, daysInStock: 142, createdAt: "2026-06-01T09:00:00Z" }),
    car({ id: "sold", registration: "SO1D CAR", status: "sold" }),
  ];
});

/** The page's wiring: the header's search drives the table. */
function AllVehicles() {
  const [query, setQuery] = React.useState("");
  return (
    <>
      <VehicleSearch value={query} onChange={setQuery} />
      <VehicleIndex onAddVehicle={() => undefined} query={query} onQueryChange={setQuery} />
    </>
  );
}

const table = async () => {
  render(<AllVehicles />);
  await screen.findByText("Vauxhall Astra");
  return screen.getByRole("table");
};

describe("VehicleIndex", () => {
  it("shows the stock in the compact columns, without the old Make and Model split", async () => {
    const t = await table();
    const headings = within(t).getAllByRole("columnheader").map((h) => h.textContent?.trim());
    expect(headings).toEqual(["Registration", "Vehicle", "Fuel", "Status", "Location", "MOT", "In stock", "Actions"]);
    // Sold cars live on the master sheet, not here.
    expect(within(t).queryByText("SO1D CAR")).toBeNull();
    expect(within(t).getByText("Ford Focus")).toBeInTheDocument();
    expect(within(t).getByText("2014")).toBeInTheDocument();
  });

  it("writes days in stock as 14d, and lifts the cars past 90 days", async () => {
    const t = await table();
    const fresh = within(t).getByText("14d");
    const old = within(t).getByText("142d");
    expect(fresh).toHaveClass("text-(--text-secondary)");
    expect(old).toHaveClass("text-(--text)");
  });

  it("says Expired, in red, once a car's MOT has run out", async () => {
    const t = await table();
    const expired = within(t).getByText("Expired");
    expect(expired).toHaveClass("text-(--text-critical)");
    expect(within(t).getByText("27 Jun 2027")).toHaveClass("text-(--text-secondary)");
  });

  it("has no quick filters, only the search", async () => {
    await table();
    expect(screen.queryByRole("group", { name: "Quick filters" })).toBeNull();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search vehicles" }), { target: { value: "ve63" } });
    await waitFor(() => expect(screen.queryByText("Vauxhall Astra")).toBeNull());
    expect(screen.getByText("Ford Focus")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 vehicles")).toBeInTheDocument();
  });

  it("gives each row a labelled Move button, only to people who can move cars", async () => {
    await table();
    expect(screen.getByRole("button", { name: "Move EK70 RXZ" })).toBeInTheDocument();
  });

  it("leaves Move out for people who can't move cars", async () => {
    perms.move = false;
    await table();
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();
  });
});
