import { createClient, type TableUpdate } from "@/lib/supabase/client";
import { invalidate, withCache } from "@/lib/cache";
import type {
  ISODate,
  SalesDeal,
  SalesStage,
  StageBehaviour,
  UUID,
  Vehicle,
  VehicleStatus,
} from "@/lib/types";
import { activityService } from "./activity-service";
import { leadService } from "./lead-service";
import { vehicleService } from "./vehicle-service";
import { listingService } from "./listing-service";
import { pipelineStageService } from "./pipeline-stage-service";
import { withDerivedCosts } from "@/lib/vehicle-costs";

const NS = "sales:";

/**
 * Behaviour for the stages the app shipped with, used when a stage row can't
 * be read (offline seed, a company created before migration 0038 ran). Keeps a
 * deposit reserving the car even if the catalogue is unavailable.
 */
const FALLBACK_BEHAVIOUR: Record<string, StageBehaviour> = {
  new_lead: "open",
  contacted: "open",
  test_drive: "open",
  offer_made: "open",
  deposit_taken: "reserved",
  collection_delivery: "reserved",
  completed_sale: "won",
  lost: "lost",
};

// A listing is "publishable" (publicly visible) once it's live or already
// tracking the sale lifecycle (reserved). Drafts and archived adverts were
// never on the forecourt, so the sale lifecycle must not stamp them.
function isPublishableStatus(status: string): boolean {
  return status === "live" || status === "reserved";
}

const SELECT = `
  id,
  companyId:company_id,
  vehicleId:vehicle_id,
  leadId:lead_id,
  customerName:customer_name,
  customerPhone:customer_phone,
  customerEmail:customer_email,
  stage,
  offerPrice:offer_price,
  agreedPrice:agreed_price,
  depositAmount:deposit_amount,
  depositDate:deposit_date,
  collectionDate:collection_date,
  completionDate:completion_date,
  sellingAgent:selling_agent,
  notes,
  createdAt:created_at,
  updatedAt:updated_at
`;

/**
 * What the sale dialog asks when a deal completes (bug list 2026-11-02, item
 * 2). Each goes onto the car's master sheet row: Date sold, Selling price,
 * Selling agent / lead from, and Total value addition.
 */
export interface SaleDetails {
  dateSold: ISODate;
  sellingPrice: number;
  /** Where the buyer came from, as the master sheet words it ("AUTO TRADER"). */
  enquirySource: string;
  valueAddition: number;
}

/** The deal's own figures, edited on the deal page (bug list 2026-11-02, item 4). */
export type DealParticulars = Partial<
  Pick<SalesDeal, "agreedPrice" | "depositAmount" | "depositDate" | "collectionDate">
>;

/** What a completed sale overwrote on the car, so moving the deal back can restore it. */
interface SaleUndo {
  previousStatus: VehicleStatus;
  previousValueAddition: number;
}

interface CreateInput {
  companyId: UUID;
  vehicleId: UUID;
  leadId: UUID | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  sellingAgent: UUID;
}

export const salesService = {
  async getAll(companyId: UUID): Promise<SalesDeal[]> {
    return withCache(`${NS}all:${companyId}`, async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sales_deals")
        .select(SELECT)
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SalesDeal[];
    });
  },

  async getById(id: UUID): Promise<SalesDeal | null> {
    return withCache(`${NS}by-id:${id}`, async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sales_deals")
        .select(SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SalesDeal | null;
    });
  },

  async create(
    input: CreateInput,
  ): Promise<{ deal: SalesDeal; existing: boolean }> {
    const supabase = createClient();
    // Dedupe: never open a second ACTIVE (non-lost) deal for the same vehicle
    // (or the same lead). Return the existing deal so the caller can still
    // navigate to it — prevents duplicate pipeline cards / two leads on one car.
    const orFilter = input.leadId
      ? `vehicle_id.eq.${input.vehicleId},lead_id.eq.${input.leadId}`
      : `vehicle_id.eq.${input.vehicleId}`;
    // Select an array (not maybeSingle) so >1 active deal never throws — just
    // take the most recently updated existing deal.
    const { data: existingRows } = await supabase
      .from("sales_deals")
      .select(SELECT)
      .eq("company_id", input.companyId)
      .neq("stage", "lost")
      .or(orFilter)
      .order("updated_at", { ascending: false })
      .limit(1);
    const existing = (existingRows ?? [])[0];
    if (existing)
      return { deal: existing as unknown as SalesDeal, existing: true };

    const { data, error } = await supabase
      .from("sales_deals")
      .insert({
        company_id: input.companyId,
        vehicle_id: input.vehicleId,
        lead_id: input.leadId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        customer_email: input.customerEmail,
        stage: "new_lead",
        selling_agent: input.sellingAgent,
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    const deal = data as unknown as SalesDeal;
    invalidate(NS);
    await activityService.log({
      companyId: input.companyId,
      userId: input.sellingAgent,
      vehicleId: input.vehicleId,
      actionType: "lead_converted",
      description: `Deal opened for ${input.customerName}`,
      metadata: { dealId: deal.id, leadId: input.leadId },
    });
    return { deal, existing: false };
  },

  /** Keep a deal's copy of the customer in step when their lead is edited. */
  async updateCustomer(
    id: UUID,
    customer: Pick<SalesDeal, "customerName" | "customerPhone" | "customerEmail">,
  ): Promise<SalesDeal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sales_deals")
      .update({
        customer_name: customer.customerName,
        customer_phone: customer.customerPhone,
        customer_email: customer.customerEmail,
      })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    invalidate(NS);
    return data as unknown as SalesDeal;
  },

  /** Save the deal's agreed price, deposit and collection date. */
  async updateParticulars(id: UUID, patch: DealParticulars): Promise<SalesDeal> {
    const supabase = createClient();
    const updates: TableUpdate<"sales_deals"> = {};
    if (patch.agreedPrice !== undefined) updates.agreed_price = patch.agreedPrice;
    if (patch.depositAmount !== undefined) updates.deposit_amount = patch.depositAmount;
    if (patch.depositDate !== undefined) updates.deposit_date = patch.depositDate;
    if (patch.collectionDate !== undefined) updates.collection_date = patch.collectionDate;
    const { data, error } = await supabase
      .from("sales_deals")
      .update(updates)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    invalidate(NS);
    return data as unknown as SalesDeal;
  },

  /**
   * The day of the viewing (migration 0060). Read on its own and forgiving of
   * a database the migration hasn't reached yet, so the pipeline never breaks
   * on it: it is simply blank until then.
   */
  async getViewingDate(id: UUID): Promise<ISODate | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sales_deals")
      .select("viewing_date")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    return (data as { viewing_date: string | null } | null)?.viewing_date ?? null;
  },

  async setViewingDate(id: UUID, date: ISODate | null): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("sales_deals")
      .update({ viewing_date: date })
      .eq("id", id);
    if (error) {
      throw new Error(
        "Couldn't save the viewing date. The database needs migration 0060 first.",
      );
    }
    invalidate(NS);
  },

  /**
   * Move a deal to another stage. Moving it into a won stage needs `sale`
   * (the sale dialog's answers), which go onto the car's master sheet row;
   * moving it out of a won stage undoes all of that: the car is available
   * again and the sale's figures are cleared.
   */
  async updateStage(
    id: UUID,
    stage: SalesStage,
    actorId: UUID,
    sale?: SaleDetails,
  ): Promise<SalesDeal> {
    const supabase = createClient();
    // Stages are configurable, so the sale lifecycle keys off the stage's
    // declared behaviour rather than its slug (GEN-65). A renamed stage keeps
    // doing what it did; a user-added one does nothing unless it says it
    // should. The slug fallbacks below keep pre-migration data working.
    const existingDeal = await salesService.getById(id);
    const behaviourOf = async (slug: string): Promise<StageBehaviour> => {
      const configured = existingDeal
        ? await pipelineStageService.getBySlug(existingDeal.companyId, slug)
        : null;
      return configured?.behaviour ?? FALLBACK_BEHAVIOUR[slug] ?? "open";
    };
    const behaviour = await behaviourOf(stage);
    const wasWon =
      existingDeal !== null &&
      existingDeal.stage !== stage &&
      (await behaviourOf(existingDeal.stage)) === "won";
    const undoingSale = wasWon && behaviour !== "won";

    const updates: TableUpdate<"sales_deals"> = { stage };
    if (behaviour === "won") {
      updates.completion_date = sale?.dateSold ?? new Date().toISOString().slice(0, 10);
      // The deal's agreed price follows the price the sale went through at.
      if (sale) updates.agreed_price = sale.sellingPrice;
    } else if (undoingSale) {
      updates.completion_date = null;
    }
    const { data, error } = await supabase
      .from("sales_deals")
      .update(updates)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    const deal = data as unknown as SalesDeal;
    invalidate(NS);
    const v = await vehicleService.getById(deal.vehicleId);
    if (v) {
      await activityService.log({
        companyId: v.companyId,
        userId: actorId,
        vehicleId: v.id,
        actionType: "sale_stage_changed",
        description: `${v.registration} → ${stage.replace("_", " ")}`,
        metadata: { dealId: id, stage },
      });
      if (behaviour === "won") {
        // Stamp the sale onto the vehicle, not just the deal. Dashboard KPIs
        // ("Sold this month"), Reports and Closed Deals all read the vehicle's
        // date_sold / selling_price — leaving them null made a completed deal
        // invisible to every sales number (GEN-43).
        const dateSold = sale?.dateSold ?? deal.completionDate ?? new Date().toISOString().slice(0, 10);
        const received = new Date(v.receivedDate).getTime();
        const sold = new Date(dateSold).getTime();
        const undo: SaleUndo = {
          previousStatus: v.status,
          previousValueAddition: v.valueAddition,
        };
        await vehicleService.update(
          v.id,
          // withDerivedCosts: the selling price and value addition move the totals.
          withDerivedCosts(v, {
            status: "sold",
            // Master sheet col BC (AVAILABLE / SOLD) follows the won deal.
            saleStatus: "sold",
            dateSold,
            // The sale dialog's price is the figure. Without one, the deal's
            // price fills in only when the vehicle has none recorded yet
            // (invoicing may already have written the definitive figure).
            sellingPrice: sale
              ? sale.sellingPrice
              : (v.sellingPrice ?? deal.agreedPrice ?? deal.offerPrice ?? null),
            ...(sale
              ? {
                  sellingAgent: sale.enquirySource.trim() || null,
                  valueAddition: sale.valueAddition,
                }
              : {}),
            // Freeze days-in-stock at the sale — the grid trusts the stored
            // value once a vehicle is sold, and quick-add seeds it with 0.
            daysInStock: Number.isNaN(received)
              ? v.daysInStock
              : Math.max(
                  0,
                  Math.floor(((Number.isNaN(sold) ? Date.now() : sold) - received) / 86_400_000),
                ),
          }),
          actorId,
        );
        // Only stamp "sold" on a listing that's actually published/live —
        // never promote a draft or archived advert into the sold lifecycle.
        const soldListing = await listingService.getForVehicle(v.id);
        if (soldListing && isPublishableStatus(soldListing.status)) {
          await listingService.setStatusForVehicle(v.id, "sold");
        }
        await activityService.log({
          companyId: v.companyId,
          userId: actorId,
          vehicleId: v.id,
          actionType: "sale_completed",
          description: `${v.registration} sold to ${deal.customerName}`,
          metadata: { dealId: id, ...undo },
        });
      } else if (undoingSale) {
        await unsellVehicle(v, id, behaviour, actorId);
      } else if (behaviour === "reserved") {
        await reserveVehicle(v, actorId);
      } else if (behaviour === "lost") {
        // Deal fell through — release the reservation back to the forecourt.
        await releaseVehicle(v, actorId);
      }
    }
    return deal;
  },

  /**
   * Point a deal (and its lead) at a different car — the customer came in
   * for one and is buying another (call 2026-10-24). A reservation follows
   * the deal: the old car goes back on sale and the new one is reserved. A
   * completed sale can't be moved, and neither can a deal onto a car another
   * open deal already holds.
   */
  async changeVehicle(
    id: UUID,
    vehicleId: UUID,
    actorId: UUID,
  ): Promise<SalesDeal> {
    const supabase = createClient();
    const deal = await salesService.getById(id);
    if (!deal) throw new Error("Deal not found");
    if (deal.vehicleId === vehicleId) return deal;

    const configured = await pipelineStageService.getBySlug(deal.companyId, deal.stage);
    const behaviour: StageBehaviour =
      configured?.behaviour ?? FALLBACK_BEHAVIOUR[deal.stage] ?? "open";
    if (behaviour === "won") {
      throw new Error("This sale is complete, so its vehicle can't be changed.");
    }

    const { data: clash } = await supabase
      .from("sales_deals")
      .select("id, customerName:customer_name")
      .eq("company_id", deal.companyId)
      .eq("vehicle_id", vehicleId)
      .neq("stage", "lost")
      .neq("id", id)
      .limit(1);
    if (clash && clash.length > 0) {
      throw new Error(
        `That car is already on an open deal for ${clash[0].customerName}.`,
      );
    }

    const [from, to] = await Promise.all([
      vehicleService.getById(deal.vehicleId),
      vehicleService.getById(vehicleId),
    ]);
    if (!to) throw new Error("Vehicle not found");

    const { data, error } = await supabase
      .from("sales_deals")
      .update({ vehicle_id: vehicleId })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    const updated = data as unknown as SalesDeal;
    invalidate(NS);

    if (deal.leadId) {
      await leadService.update(deal.leadId, {
        vehicleId,
        vehicleInterest: `${to.make} ${to.model} (${to.registration})`,
      });
    }
    if (behaviour === "reserved") {
      if (from) await releaseVehicle(from, actorId);
      await reserveVehicle(to, actorId);
    }

    await activityService.log({
      companyId: deal.companyId,
      userId: actorId,
      vehicleId,
      actionType: "sale_stage_changed",
      description: `${deal.customerName}'s deal moved from ${from?.registration ?? "another car"} to ${to.registration}`,
      metadata: { dealId: id, fromVehicleId: deal.vehicleId, toVehicleId: vehicleId },
    });
    return updated;
  },
};

/**
 * Undo a completed sale: the deal moved back out of Completed sale. The car
 * is available on the master sheet again (the database trigger moves it from
 * Sold back to the forecourt), the sale's date, price and enquiry source are
 * cleared, and the value addition goes back to what it was before the sale
 * dialog set it. A deal moved back to a reserved stage keeps the car reserved;
 * anywhere else it is back on sale.
 */
async function unsellVehicle(
  v: Vehicle,
  dealId: UUID,
  behaviour: StageBehaviour,
  actorId: UUID,
): Promise<void> {
  const supabase = createClient();
  const { data: logged } = await supabase
    .from("activity_log")
    .select("metadata")
    .eq("vehicle_id", v.id)
    .eq("action_type", "sale_completed")
    .order("created_at", { ascending: false })
    .limit(5);
  const undo = ((logged ?? []) as { metadata: Record<string, unknown> | null }[])
    .map((r) => r.metadata ?? {})
    .find((m) => m.dealId === dealId) as Partial<SaleUndo> | undefined;

  const previous = undo?.previousStatus;
  const status: VehicleStatus =
    behaviour === "reserved"
      ? "reserved"
      : previous && previous !== "sold" && previous !== "reserved" && previous !== "returned"
        ? previous
        : "listed";

  await vehicleService.update(
    v.id,
    withDerivedCosts(v, {
      status,
      saleStatus: "available",
      dateSold: null,
      sellingPrice: null,
      sellingAgent: null,
      ...(typeof undo?.previousValueAddition === "number"
        ? { valueAddition: undo.previousValueAddition }
        : {}),
    }),
    actorId,
  );
  // A new car's value addition is its Things to Do total; re-sum it in case
  // the sale dialog overrode it and no earlier figure was recorded.
  await vehicleService.recomputeValueAddition(v.id, actorId);

  const listing = await listingService.getForVehicle(v.id);
  if (listing?.status === "sold") {
    await listingService.setStatusForVehicle(
      v.id,
      behaviour === "reserved" ? "reserved" : "live",
    );
  }
  await activityService.log({
    companyId: v.companyId,
    userId: actorId,
    vehicleId: v.id,
    actionType: "sale_stage_changed",
    description: `${v.registration} sale undone: back to ${status === "reserved" ? "reserved" : "available"}`,
    metadata: { dealId },
  });
}

/** Reserve the car so it stops showing as available everywhere. */
async function reserveVehicle(v: Vehicle, actorId: UUID): Promise<void> {
  if (v.status !== "reserved" && v.status !== "sold") {
    await vehicleService.changeStatus(v.id, "reserved", actorId);
  }
  // Only flip a live/publishable advert to "reserved" — leave drafts
  // and archived listings untouched (they were never publicly visible).
  const listing = await listingService.getForVehicle(v.id);
  if (listing && isPublishableStatus(listing.status)) {
    await listingService.setStatusForVehicle(v.id, "reserved");
  }
}

/** Undo a reservation: the car goes back on sale. */
async function releaseVehicle(v: Vehicle, actorId: UUID): Promise<void> {
  if (v.status !== "reserved") return;
  await vehicleService.changeStatus(v.id, "listed", actorId);
  // Revert the listing to what it was before the deal reserved it,
  // without silently publishing. A "reserved" advert was live before
  // the deal (reservation only stamps publishable listings), so it
  // goes back live. Any non-reserved listing (e.g. a draft) reverts to
  // draft rather than being promoted to live without a publish step.
  const listing = await listingService.getForVehicle(v.id);
  if (listing) {
    await listingService.setStatusForVehicle(
      v.id,
      listing.status === "reserved" ? "live" : "draft",
    );
  }
}
