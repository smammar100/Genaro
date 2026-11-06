/**
 * Characterization tests — sales pipeline stage transitions.
 *
 * Pins the side-effect matrix of `salesService.updateStage`:
 *   completed_sale      → completion_date stamped, vehicle → sold,
 *                         publishable listing → sold (drafts untouched)
 *   deposit_taken /
 *   collection_delivery → vehicle reserved, live listing → reserved
 *   lost                → reserved vehicle released back to listed;
 *                         reserved listing → live, anything else → draft
 * plus the create() dedupe (never a second active deal for one lead) and the
 * rule that a car takes any number of leads but only one deal holds it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseMock,
  stepArgs,
  type QueryCall,
  type SupabaseMock,
} from "@/test/supabase-mock";
import { makeListing, makeSalesDeal, makeVehicle } from "@/test/factories";
import type { Listing, SalesStage, Vehicle } from "@/lib/types";

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

const vehicleMocks = vi.hoisted(() => ({
  getById: vi.fn(),
  changeStatus: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  recomputeValueAddition: vi.fn(async () => null),
}));
vi.mock("./vehicle-service", () => ({ vehicleService: vehicleMocks }));

const listingMocks = vi.hoisted(() => ({
  getForVehicle: vi.fn(),
  setStatusForVehicle: vi.fn(async () => undefined),
}));
vi.mock("./listing-service", () => ({ listingService: listingMocks }));

const leadMocks = vi.hoisted(() => ({
  update: vi.fn(async () => undefined),
}));
vi.mock("./lead-service", () => ({ leadService: leadMocks }));

import { salesService } from "./sales-service";

/** Another customer's deal on the same car, as the holder probe reads it. */
interface OtherDeal {
  id: string;
  customerName: string;
  stage: string;
}

/** The query for the car's other deals: it leaves out the deal itself. */
const isHolderProbe = (call: QueryCall) =>
  call.table === "sales_deals" &&
  call.steps.some((s) => s.method === "neq" && s.args[0] === "id");

const updateCall = () =>
  db.current.calls.find((c) => c.table === "sales_deals" && c.steps.some((s) => s.method === "update"));

function setup(opts: {
  stage: SalesStage;
  vehicle?: Partial<Vehicle>;
  listing?: Partial<Listing> | null;
  /** Other deals on the car. */
  others?: OtherDeal[];
  /** The company's stage catalogue; empty falls back to the shipped stages. */
  stages?: { slug: string; behaviour: string }[];
}) {
  const deal = makeSalesDeal({ stage: opts.stage });
  db.current = createSupabaseMock((call) => {
    if (isHolderProbe(call)) return { data: opts.others ?? [], error: null };
    if (call.table === "sales_deals") return { data: deal, error: null };
    if (call.table === "pipeline_stages") return { data: opts.stages ?? [], error: null };
    return undefined;
  });
  vehicleMocks.getById.mockResolvedValue(makeVehicle(opts.vehicle));
  listingMocks.getForVehicle.mockResolvedValue(
    opts.listing === null ? null : makeListing(opts.listing),
  );
  return deal;
}

beforeEach(() => {
  vehicleMocks.getById.mockReset();
  vehicleMocks.changeStatus.mockReset().mockResolvedValue(undefined);
  vehicleMocks.update.mockReset().mockResolvedValue(undefined);
  vehicleMocks.recomputeValueAddition.mockReset().mockResolvedValue(null);
  listingMocks.getForVehicle.mockReset();
  listingMocks.setStatusForVehicle.mockReset().mockResolvedValue(undefined);
  leadMocks.update.mockReset().mockResolvedValue(undefined);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-02T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("updateStage → completed_sale", () => {
  it("stamps completion_date (today, UTC date) and marks the vehicle sold", async () => {
    setup({ stage: "completed_sale", listing: { status: "live" } });
    await salesService.updateStage("deal-0001", "completed_sale", "user-9");

    const update = db.current.calls.find((c) =>
      c.steps.some((s) => s.method === "update"),
    );
    expect(stepArgs(update!, "update")).toEqual([
      { stage: "completed_sale", completion_date: "2026-07-02" },
    ]);
    // GEN-43: completing a sale stamps the vehicle row itself (status,
    // date_sold, selling_price, frozen days-in-stock) via update(), not a
    // bare changeStatus() — the dashboard/reports read those columns.
    expect(vehicleMocks.update).toHaveBeenCalledWith(
      "veh-0001",
      expect.objectContaining({ status: "sold", dateSold: "2026-07-02" }),
      "user-9",
    );
    expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith(
      "veh-0001",
      "sold",
    );
  });

  it("never stamps 'sold' on a draft listing", async () => {
    setup({ stage: "completed_sale", listing: { status: "draft" } });
    await salesService.updateStage("deal-0001", "completed_sale", "user-9");
    expect(vehicleMocks.update).toHaveBeenCalledWith(
      "veh-0001",
      expect.objectContaining({ status: "sold" }),
      "user-9",
    );
    expect(listingMocks.setStatusForVehicle).not.toHaveBeenCalled();
  });
});

describe("updateStage → completed_sale with the sale dialog's details", () => {
  const sale = {
    dateSold: "2026-06-28",
    sellingPrice: 12995,
    enquirySource: "CAR GURUS",
    valueAddition: 640,
  };

  it("dates the deal from the sale and writes all four onto the car", async () => {
    setup({
      stage: "completed_sale",
      vehicle: { status: "reserved", receivedDate: "2026-06-01", valueAddition: 450 },
      listing: { status: "reserved" },
    });
    await salesService.updateStage("deal-0001", "completed_sale", "user-9", sale);

    const update = db.current.calls.find((c) => c.steps.some((s) => s.method === "update"));
    expect(stepArgs(update!, "update")).toEqual([
      { stage: "completed_sale", completion_date: "2026-06-28", agreed_price: 12995 },
    ]);
    expect(vehicleMocks.update).toHaveBeenCalledWith(
      "veh-0001",
      expect.objectContaining({
        status: "sold",
        saleStatus: "sold",
        dateSold: "2026-06-28",
        sellingPrice: 12995,
        sellingAgent: "CAR GURUS",
        valueAddition: 640,
        // Days in stock run to the date of sale, not today.
        daysInStock: 27,
      }),
      "user-9",
    );
  });

  it("the dialog's price replaces one already on the car", async () => {
    setup({ stage: "completed_sale", vehicle: { sellingPrice: 9000 }, listing: null });
    await salesService.updateStage("deal-0001", "completed_sale", "user-9", sale);
    expect(vehicleMocks.update).toHaveBeenCalledWith(
      "veh-0001",
      expect.objectContaining({ sellingPrice: 12995 }),
      "user-9",
    );
  });
});

describe("updateStage → out of completed_sale (the sale is undone)", () => {
  function setupUndo(opts: { to: SalesStage; listing?: Partial<Listing> | null; logged?: unknown[] }) {
    const before = makeSalesDeal({ stage: "completed_sale", completionDate: "2026-06-28" });
    const after = makeSalesDeal({ stage: opts.to, completionDate: null });
    db.current = createSupabaseMock((call) => {
      // No other deals on the car.
      if (isHolderProbe(call)) return { data: [], error: null };
      if (call.table === "sales_deals") {
        const writing = call.steps.some((s) => s.method === "update");
        return { data: writing ? after : before, error: null };
      }
      if (call.table === "activity_log") {
        return {
          data: opts.logged ?? [
            { metadata: { dealId: "deal-0001", previousStatus: "ready", previousValueAddition: 450 } },
          ],
          error: null,
        };
      }
      return undefined;
    });
    vehicleMocks.getById.mockResolvedValue(
      makeVehicle({
        status: "sold",
        saleStatus: "sold",
        dateSold: "2026-06-28",
        sellingPrice: 12995,
        sellingAgent: "CAR GURUS",
        valueAddition: 640,
      }),
    );
    listingMocks.getForVehicle.mockResolvedValue(
      opts.listing === null ? null : makeListing(opts.listing ?? { status: "sold" }),
    );
  }

  it("clears the completion date and every sale figure; the car is available again", async () => {
    setupUndo({ to: "contacted" });
    await salesService.updateStage("deal-0001", "contacted", "user-9");

    const update = db.current.calls.find(
      (c) => c.table === "sales_deals" && c.steps.some((s) => s.method === "update"),
    );
    expect(stepArgs(update!, "update")).toEqual([{ stage: "contacted", completion_date: null }]);
    expect(vehicleMocks.update).toHaveBeenCalledWith(
      "veh-0001",
      expect.objectContaining({
        status: "ready",
        saleStatus: "available",
        dateSold: null,
        sellingPrice: null,
        sellingAgent: null,
        valueAddition: 450,
      }),
      "user-9",
    );
    expect(vehicleMocks.recomputeValueAddition).toHaveBeenCalledWith("veh-0001", "user-9");
    expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith("veh-0001", "live");
  });

  it("back to a reserved stage, the car stays reserved", async () => {
    setupUndo({ to: "deposit_taken" });
    await salesService.updateStage("deal-0001", "deposit_taken", "user-9");
    expect(vehicleMocks.update).toHaveBeenCalledWith(
      "veh-0001",
      expect.objectContaining({ status: "reserved", saleStatus: "available", sellingPrice: null }),
      "user-9",
    );
    expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith("veh-0001", "reserved");
    // Not re-reserved through the normal path on top of the undo.
    expect(vehicleMocks.changeStatus).not.toHaveBeenCalled();
  });

  it("with no record of the sale, the car goes back to listed and keeps its value addition", async () => {
    setupUndo({ to: "lost", logged: [] });
    await salesService.updateStage("deal-0001", "lost", "user-9");
    const patch = (vehicleMocks.update.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(patch).toMatchObject({ status: "listed", saleStatus: "available", dateSold: null });
    expect(patch).not.toHaveProperty("valueAddition", 450);
  });

  it("a listing that isn't marked sold is left alone", async () => {
    setupUndo({ to: "contacted", listing: { status: "draft" } });
    await salesService.updateStage("deal-0001", "contacted", "user-9");
    expect(listingMocks.setStatusForVehicle).not.toHaveBeenCalled();
  });
});

describe("updateParticulars", () => {
  it("writes only the fields given", async () => {
    setup({ stage: "offer_made" });
    await salesService.updateParticulars("deal-0001", { agreedPrice: 14500, depositAmount: 500 });
    const update = db.current.calls.find((c) => c.steps.some((s) => s.method === "update"));
    expect(stepArgs(update!, "update")).toEqual([{ agreed_price: 14500, deposit_amount: 500 }]);
  });
});

describe.each(["deposit_taken", "collection_delivery"] as const)(
  "updateStage → %s (reservation)",
  (stage) => {
    it("reserves an available vehicle and its live listing", async () => {
      setup({ stage, vehicle: { status: "listed" }, listing: { status: "live" } });
      await salesService.updateStage("deal-0001", stage, "user-9");
      expect(vehicleMocks.changeStatus).toHaveBeenCalledWith(
        "veh-0001",
        "reserved",
        "user-9",
      );
      expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith(
        "veh-0001",
        "reserved",
      );
    });

    it("skips the vehicle status change when already reserved/sold, but still re-stamps the listing", async () => {
      setup({ stage, vehicle: { status: "reserved" }, listing: { status: "reserved" } });
      await salesService.updateStage("deal-0001", stage, "user-9");
      expect(vehicleMocks.changeStatus).not.toHaveBeenCalled();
      // NOTE: pins existing behavior — the listing is re-set to "reserved"
      // every time, even when it already is.
      expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith(
        "veh-0001",
        "reserved",
      );
    });

    it("leaves a draft listing untouched", async () => {
      setup({ stage, vehicle: { status: "listed" }, listing: { status: "draft" } });
      await salesService.updateStage("deal-0001", stage, "user-9");
      expect(listingMocks.setStatusForVehicle).not.toHaveBeenCalled();
    });
  },
);

describe("updateStage → lost (release reservation)", () => {
  it("releases a reserved vehicle back to listed; reserved listing goes live", async () => {
    setup({ stage: "lost", vehicle: { status: "reserved" }, listing: { status: "reserved" } });
    await salesService.updateStage("deal-0001", "lost", "user-9");
    expect(vehicleMocks.changeStatus).toHaveBeenCalledWith(
      "veh-0001",
      "listed",
      "user-9",
    );
    expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith(
      "veh-0001",
      "live",
    );
  });

  it("a non-reserved listing reverts to draft, never silently published", async () => {
    setup({ stage: "lost", vehicle: { status: "reserved" }, listing: { status: "live" } });
    await salesService.updateStage("deal-0001", "lost", "user-9");
    // NOTE: pins existing behavior — possible bug: a listing that was LIVE
    // (not reserved) when the deal is lost gets demoted to "draft".
    expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith(
      "veh-0001",
      "draft",
    );
  });

  it("does nothing to vehicle/listing when the vehicle was never reserved", async () => {
    setup({ stage: "lost", vehicle: { status: "listed" }, listing: { status: "live" } });
    await salesService.updateStage("deal-0001", "lost", "user-9");
    expect(vehicleMocks.changeStatus).not.toHaveBeenCalled();
    expect(listingMocks.setStatusForVehicle).not.toHaveBeenCalled();
  });
});

describe("several deals on one car: any number of leads, one deal holds it", () => {
  const lead = (customerName: string, stage = "new_lead"): OtherDeal => ({
    id: `deal-${customerName}`,
    customerName,
    stage,
  });

  it("takes a deposit on a car that other customers only have leads on", async () => {
    setup({
      stage: "deposit_taken",
      vehicle: { status: "listed" },
      listing: { status: "live" },
      others: [lead("Faysal Ahmed"), lead("Akash Patel", "contacted")],
    });
    await salesService.updateStage("deal-0001", "deposit_taken", "user-9");
    expect(stepArgs(updateCall()!, "update")).toEqual([{ stage: "deposit_taken" }]);
    expect(vehicleMocks.changeStatus).toHaveBeenCalledWith("veh-0001", "reserved", "user-9");
  });

  it("asks only about the car's other live deals: not this one, not lost ones", async () => {
    setup({ stage: "deposit_taken", vehicle: { status: "listed" } });
    await salesService.updateStage("deal-0001", "deposit_taken", "user-9");
    const probe = db.current.calls.find(isHolderProbe)!;
    expect(probe.steps.filter((s) => s.method === "eq").map((s) => s.args)).toEqual([
      ["company_id", "co-0001"],
      ["vehicle_id", "veh-0001"],
    ]);
    expect(probe.steps.filter((s) => s.method === "neq").map((s) => s.args)).toEqual([
      ["stage", "lost"],
      ["id", "deal-0001"],
    ]);
  });

  it.each(["deposit_taken", "collection_delivery"] as const)(
    "refuses %s while another customer's deposit holds the car, writing nothing",
    async (stage) => {
      setup({
        stage,
        vehicle: { status: "reserved" },
        others: [lead("Faysal Ahmed", "deposit_taken")],
      });
      await expect(salesService.updateStage("deal-0001", stage, "user-9")).rejects.toThrow(
        "This car is already reserved for Faysal Ahmed. Mark their deal lost first.",
      );
      expect(updateCall()).toBeUndefined();
      expect(vehicleMocks.changeStatus).not.toHaveBeenCalled();
      expect(vehicleMocks.update).not.toHaveBeenCalled();
    },
  );

  it("refuses to sell a car another customer has already bought", async () => {
    setup({ stage: "completed_sale", others: [lead("Neda Rabiei", "completed_sale")] });
    await expect(
      salesService.updateStage("deal-0001", "completed_sale", "user-9"),
    ).rejects.toThrow("This car is already sold to Neda Rabiei.");
    expect(updateCall()).toBeUndefined();
    expect(vehicleMocks.update).not.toHaveBeenCalled();
  });

  it("refuses to sell a car another customer has reserved", async () => {
    setup({ stage: "completed_sale", others: [lead("Faysal Ahmed", "collection_delivery")] });
    await expect(
      salesService.updateStage("deal-0001", "completed_sale", "user-9"),
    ).rejects.toThrow("already reserved for Faysal Ahmed");
    expect(updateCall()).toBeUndefined();
  });

  it("reads a renamed or added stage's behaviour from the company's catalogue", async () => {
    setup({
      stage: "deposit_taken",
      others: [lead("Faysal Ahmed", "holding_fee")],
      stages: [{ slug: "holding_fee", behaviour: "reserved" }],
    });
    await expect(
      salesService.updateStage("deal-0001", "deposit_taken", "user-9"),
    ).rejects.toThrow("already reserved for Faysal Ahmed");
  });

  it("moving between open stages never asks about other deals", async () => {
    setup({ stage: "contacted", others: [lead("Faysal Ahmed", "deposit_taken")] });
    await salesService.updateStage("deal-0001", "contacted", "user-9");
    expect(db.current.calls.some(isHolderProbe)).toBe(false);
  });

  it("a lost lead leaves another customer's reservation alone", async () => {
    setup({
      stage: "lost",
      vehicle: { status: "reserved" },
      listing: { status: "reserved" },
      others: [lead("Faysal Ahmed", "deposit_taken")],
    });
    await salesService.updateStage("deal-0001", "lost", "user-9");
    expect(vehicleMocks.changeStatus).not.toHaveBeenCalled();
    expect(listingMocks.setStatusForVehicle).not.toHaveBeenCalled();
  });

  it("a lost deposit frees the car when the others are only leads", async () => {
    setup({
      stage: "lost",
      vehicle: { status: "reserved" },
      listing: { status: "reserved" },
      others: [lead("Akash Patel")],
    });
    await salesService.updateStage("deal-0001", "lost", "user-9");
    expect(vehicleMocks.changeStatus).toHaveBeenCalledWith("veh-0001", "listed", "user-9");
    expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith("veh-0001", "live");
  });
});

describe("updateStage → informational stages", () => {
  it("contacted changes nothing beyond the stage column", async () => {
    setup({ stage: "contacted", listing: { status: "live" } });
    await salesService.updateStage("deal-0001", "contacted", "user-9");
    const update = db.current.calls.find((c) =>
      c.steps.some((s) => s.method === "update"),
    );
    expect(stepArgs(update!, "update")).toEqual([{ stage: "contacted" }]);
    expect(vehicleMocks.changeStatus).not.toHaveBeenCalled();
    expect(listingMocks.setStatusForVehicle).not.toHaveBeenCalled();
  });
});

describe("create — active-deal dedupe", () => {
  const input = {
    companyId: "co-0001",
    vehicleId: "veh-0001",
    leadId: "lead-0001",
    customerName: "Sarah Whitfield",
    customerPhone: "07700 900123",
    customerEmail: null,
    sellingAgent: "user-2",
  };

  const inserted = () =>
    db.current.calls.find((c) => c.steps.some((s) => s.method === "insert"));

  it("returns the lead's own open deal instead of inserting a duplicate", async () => {
    const existing = makeSalesDeal({ stage: "offer_made" });
    db.current = createSupabaseMock((call) => {
      if (call.table === "sales_deals") return { data: [existing], error: null };
      return undefined;
    });
    const res = await salesService.create(input);
    expect(res).toEqual({ deal: existing, existing: true });
    // The probe looks for this lead's live deals only, never the car's.
    const probe = db.current.calls[0];
    expect(probe.steps.filter((s) => s.method === "eq").map((s) => s.args)).toEqual([
      ["company_id", "co-0001"],
      ["lead_id", "lead-0001"],
    ]);
    expect(stepArgs(probe, "neq")).toEqual(["stage", "lost"]);
    expect(stepArgs(probe, "or")).toBeUndefined();
    expect(inserted()).toBeUndefined();
  });

  it("opens a second customer's deal on a car that already has one (bug list 2026-11-06)", async () => {
    // Faysal's deal is on veh-0001. Daniel's new lead has no deal of its own,
    // so the probe for his lead finds nothing and his deal is inserted.
    const daniel = { ...input, leadId: "lead-0002", customerName: "Daniel Okafor" };
    const created = makeSalesDeal({ id: "deal-0002", leadId: "lead-0002", customerName: "Daniel Okafor" });
    db.current = createSupabaseMock((call) => {
      if (call.steps.some((s) => s.method === "insert")) return { data: created, error: null };
      const byLead = call.steps.some((s) => s.method === "eq" && s.args[0] === "lead_id");
      return { data: byLead ? [] : [makeSalesDeal({ customerName: "Faysal Ahmed" })], error: null };
    });
    const res = await salesService.create(daniel);
    expect(res).toEqual({ deal: created, existing: false });
    expect(stepArgs(inserted()!, "insert")?.[0]).toMatchObject({
      vehicle_id: "veh-0001",
      lead_id: "lead-0002",
      customer_name: "Daniel Okafor",
      stage: "new_lead",
    });
  });

  it("without a lead, inserts straight away", async () => {
    db.current = createSupabaseMock(() => ({ data: makeSalesDeal({ leadId: null }), error: null }));
    const res = await salesService.create({ ...input, leadId: null });
    expect(res.existing).toBe(false);
    expect(db.current.calls).toHaveLength(1);
    expect(inserted()).toBeDefined();
  });

  it("inserts a new deal at stage new_lead when none is active", async () => {
    const created = makeSalesDeal();
    let probed = false;
    db.current = createSupabaseMock((call) => {
      if (call.table === "sales_deals" && !probed) {
        probed = true;
        return { data: [], error: null };
      }
      return { data: created, error: null };
    });
    const res = await salesService.create(input);
    expect(res.existing).toBe(false);
    const insert = db.current.calls.find((c) =>
      c.steps.some((s) => s.method === "insert"),
    );
    expect(stepArgs(insert!, "insert")?.[0]).toMatchObject({
      stage: "new_lead",
      vehicle_id: "veh-0001",
      lead_id: "lead-0001",
    });
  });
});

describe("changeVehicle — the customer buys a different car", () => {
  const OLD = "veh-0001";
  const NEW = "veh-0002";

  /**
   * sales_deals answers three queries: the deal lookup (maybeSingle), the
   * probe for the new car's other deals, and the update. `others` is what
   * the probe finds on the new car.
   */
  function setupSwap(opts: {
    stage: SalesStage;
    others?: OtherDeal[];
    oldVehicle?: Partial<Vehicle>;
    newVehicle?: Partial<Vehicle>;
    listing?: Partial<Listing>;
  }) {
    const deal = makeSalesDeal({ stage: opts.stage, vehicleId: OLD });
    db.current = createSupabaseMock((call) => {
      if (call.table !== "sales_deals") return undefined;
      const methods = call.steps.map((s) => s.method);
      if (methods.includes("update")) {
        return { data: { ...deal, vehicleId: NEW }, error: null };
      }
      if (isHolderProbe(call)) return { data: opts.others ?? [], error: null };
      return { data: deal, error: null };
    });
    vehicleMocks.getById.mockImplementation(async (id: string) =>
      id === OLD
        ? makeVehicle({ id: OLD, registration: "AB12 CDE", ...opts.oldVehicle })
        : makeVehicle({
            id: NEW,
            registration: "XY34 ZZZ",
            make: "VOLKSWAGEN",
            model: "POLO",
            ...opts.newVehicle,
          }),
    );
    listingMocks.getForVehicle.mockResolvedValue(makeListing(opts.listing));
    return deal;
  }

  it("moves an open deal and its lead to the new car, leaving statuses alone", async () => {
    setupSwap({ stage: "offer_made" });
    const res = await salesService.changeVehicle("deal-0001", NEW, "user-9");

    expect(res.vehicleId).toBe(NEW);
    expect(stepArgs(updateCall()!, "update")).toEqual([{ vehicle_id: NEW }]);
    expect(leadMocks.update).toHaveBeenCalledWith("lead-0001", {
      vehicleId: NEW,
      vehicleInterest: "VOLKSWAGEN POLO (XY34 ZZZ)",
    });
    expect(vehicleMocks.changeStatus).not.toHaveBeenCalled();
    expect(listingMocks.setStatusForVehicle).not.toHaveBeenCalled();
  });

  it("moves a deposit's reservation: the old car goes back on sale, the new one is reserved", async () => {
    setupSwap({
      stage: "deposit_taken",
      oldVehicle: { status: "reserved" },
      newVehicle: { status: "listed" },
      listing: { status: "reserved" },
    });
    await salesService.changeVehicle("deal-0001", NEW, "user-9");

    expect(vehicleMocks.changeStatus).toHaveBeenCalledWith(OLD, "listed", "user-9");
    expect(vehicleMocks.changeStatus).toHaveBeenCalledWith(NEW, "reserved", "user-9");
    expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith(OLD, "live");
    expect(listingMocks.setStatusForVehicle).toHaveBeenCalledWith(NEW, "reserved");
  });

  it("refuses a completed sale", async () => {
    setupSwap({ stage: "completed_sale" });
    await expect(salesService.changeVehicle("deal-0001", NEW, "user-9")).rejects.toThrow(
      "This sale is complete",
    );
    expect(updateCall()).toBeUndefined();
    expect(leadMocks.update).not.toHaveBeenCalled();
  });

  it("moves an open deal onto a car other customers have deals on", async () => {
    setupSwap({
      stage: "offer_made",
      others: [{ id: "deal-0002", customerName: "Imran Qureshi", stage: "deposit_taken" }],
    });
    const res = await salesService.changeVehicle("deal-0001", NEW, "user-9");
    expect(res.vehicleId).toBe(NEW);
    // An open deal doesn't hold a car, so the new car's deals aren't asked about.
    expect(db.current.calls.some(isHolderProbe)).toBe(false);
  });

  it("moves a deposit onto a car that only has leads on it", async () => {
    setupSwap({
      stage: "deposit_taken",
      others: [{ id: "deal-0002", customerName: "Imran Qureshi", stage: "new_lead" }],
      oldVehicle: { status: "reserved" },
      newVehicle: { status: "listed" },
      listing: { status: "reserved" },
    });
    await salesService.changeVehicle("deal-0001", NEW, "user-9");
    expect(stepArgs(updateCall()!, "update")).toEqual([{ vehicle_id: NEW }]);
    expect(vehicleMocks.changeStatus).toHaveBeenCalledWith(NEW, "reserved", "user-9");
  });

  it("refuses to move a deposit onto a car another deal has reserved, naming the customer", async () => {
    setupSwap({
      stage: "deposit_taken",
      others: [{ id: "deal-0002", customerName: "Imran Qureshi", stage: "collection_delivery" }],
    });
    await expect(salesService.changeVehicle("deal-0001", NEW, "user-9")).rejects.toThrow(
      "This car is already reserved for Imran Qureshi",
    );
    expect(updateCall()).toBeUndefined();
    expect(leadMocks.update).not.toHaveBeenCalled();
    expect(vehicleMocks.changeStatus).not.toHaveBeenCalled();
    // The probe is for the new car, leaving out this deal and lost ones.
    const probe = db.current.calls.find(isHolderProbe)!;
    expect(probe.steps.filter((s) => s.method === "eq").map((s) => s.args)).toContainEqual([
      "vehicle_id",
      NEW,
    ]);
    expect(probe.steps.filter((s) => s.method === "neq").map((s) => s.args)).toEqual([
      ["stage", "lost"],
      ["id", "deal-0001"],
    ]);
  });

  it("does nothing when the car is unchanged", async () => {
    setupSwap({ stage: "offer_made" });
    await salesService.changeVehicle("deal-0001", OLD, "user-9");
    expect(updateCall()).toBeUndefined();
    expect(leadMocks.update).not.toHaveBeenCalled();
  });
});
