"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banner,
  ContextualSaveBar,
  Layout,
  Page,
} from "@/components/polaris";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import { todoService } from "@/lib/services/todo-service";
import { dvlaService } from "@/lib/services/dvla-service";
import { dealerPartnerService } from "@/lib/services/dealer-partner-service";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { teamService } from "@/lib/services/team-service";
import type { DealerPartner, User } from "@/lib/types";
import {
  computeCostTotals,
  type VehicleCostInputs,
} from "@/lib/vehicle-costs";
import { logBookPatch } from "@/lib/master-sheet";
import {
  ComplianceCard,
  type ComplianceCardValue,
} from "./compliance-card";
import { toast } from "@/lib/toast";
import { formatCurrency, formatRegPlate } from "@/lib/utils";
import { BuyingCard } from "./add-vehicle/buying-card";
import { CostSummaryCard } from "./add-vehicle/cost-summary-card";
import { IdentityCard } from "./add-vehicle/identity-card";
import { PricingCard } from "./add-vehicle/pricing-card";
import { PurchaseCostsCard } from "./add-vehicle/purchase-costs-card";
import { ReceivingCard } from "./add-vehicle/receiving-card";
import {
  RegistrationLookupCard,
  type DvlaState,
} from "./add-vehicle/registration-lookup";
import {
  UNREGISTERED,
  fieldIds,
  schema,
  type FormInput,
} from "./add-vehicle/schema";
import { SectionStepper, type StepperSection } from "./add-vehicle/section-stepper";
import { StickySidebar } from "./add-vehicle/sticky-sidebar";
import { scrollToElement } from "./add-vehicle/scroll";
import { TodosCard, type ArrivalTodo } from "./add-vehicle/todos-card";
import { ValuationCard } from "./add-vehicle/valuation-card";
import { VehicleConfirmationCard } from "./add-vehicle/vehicle-confirmation-card";

// v4.1 spec §11.3 — Add Vehicle arrival form, laid out as one Polaris product
// form (Variation A, "lookup first, then one page"): the registration lookup
// first, then every section's card in the main column, with the valuation
// and a live cost summary in the sidebar. A
// horizontal section stepper under the title jumps between sections. The
// form is a single <form> with one onSubmit; this file owns the form state,
// lookups and submit, and the cards live in ./add-vehicle/.

/** The form's sections, in page order — the stepper's steps. */
type SectionId = "identity" | "buying" | "costs" | "receiving" | "pricing";
const SECTIONS: { id: SectionId; title: string; hint: string }[] = [
  { id: "identity", title: "Vehicle identity", hint: "Reg and specs" },
  { id: "buying", title: "Buying", hint: "Seller and invoice" },
  { id: "costs", title: "Purchase costs", hint: "Price, fees, VAT" },
  { id: "receiving", title: "Receiving", hint: "Arrival and to-dos" },
  { id: "pricing", title: "Pricing", hint: "Optional" },
];

/** A form number that may be blank → the number, or null when not entered. */
function opt(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Derive a Great/Good/Fair/High price indicator by comparing the intended
 * listing price to AutoTrader's retail valuation. Mirrors AutoTrader's own
 * banding loosely (their exact thresholds are advert-side and not exposed
 * on the vehicle lookup). Returns null when either input is missing.
 */
function deriveAtPriceIndicator(
  listingPrice: number | null,
  retailValuation: number | null,
): string | null {
  if (!listingPrice || !retailValuation || retailValuation <= 0) return null;
  const ratio = listingPrice / retailValuation;
  if (ratio <= 0.96) return "great";
  if (ratio <= 1.0) return "good";
  if (ratio <= 1.05) return "above_average";
  return "high";
}

/** Scroll a field to the middle of the view and put the cursor in it. */
function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  scrollToElement(el, "center");
  el.focus({ preventScroll: true });
}

export function ArrivalForm() {
  const baseId = useId();
  const ids = fieldIds(baseId);
  const sectionId = (id: SectionId) => `${baseId}-section-${id}`;
  const formEndId = `${baseId}-form-end`;
  const { user, company } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, confirmDialog } = useConfirm();
  const [submitting, setSubmitting] = useState(false);
  // dvlaState drives the inline status shown under the registration field.
  //  - idle         : nothing has been looked up yet
  //  - loading      : lookup in flight
  //  - found        : DVLA returned data and the form has been auto-filled
  //  - not_found    : DVLA didn't recognise this reg, or the format was invalid
  //  - duplicate    : we already have this reg in our stock book (we don't
  //                   even call DVLA — we show the user where to find it)
  const [dvlaState, setDvlaState] = useState<DvlaState>("idle");
  // Whether the latest lookup returned vehicle data (and filled the form) —
  // drives the confirmation card. A duplicate can come back without it.
  const [dvlaMatched, setDvlaMatched] = useState(false);
  // Populated only when dvlaState === "duplicate"
  const [duplicate, setDuplicate] = useState<{
    id: string;
    stockId: string;
    label: string;
  } | null>(null);
  const [todos, setTodos] = useState<ArrivalTodo[]>([]);
  const [newTodo, setNewTodo] = useState<ArrivalTodo>({ description: "", cost: 0 });

  // Module-F compliance card state — driven by the DVLA + DVSA lookup.
  // Lives outside react-hook-form because these fields are read-only by
  // default; user overrides flow through `setCompliance`.
  const [compliance, setCompliance] = useState<ComplianceCardValue>({
    registrationDate: null,
    co2Emissions: null,
    euroStatus: null,
    taxStatus: null,
    taxDueDate: null,
    motStatus: null,
    motExpiryDate: null,
    wheelplan: null,
    automatedVehicle: null,
    dateOfLastV5CIssued: null,
  });
  const [complianceSources, setComplianceSources] = useState<
    | {
        dvla: "ok" | "error";
        dvsa: "ok" | "error" | "missing_credentials";
        autotrader: "ok" | "error" | "missing_credentials";
      }
    | undefined
  >(undefined);
  const [motSource, setMotSource] = useState<
    "dvsa" | "autotrader" | "dvla" | null
  >(null);
  const [verifiedAt, setVerifiedAt] = useState<Date | null>(null);

  // AutoTrader taxonomy + valuation captured from the lookup. Persisted on
  // create; the retail valuation also powers the "Use as listing price" hint.
  const [atData, setAtData] = useState<{
    derivative: string | null;
    generation: string | null;
    trim: string | null;
    atDerivativeId: string | null;
    retailValuation: number | null;
    tradeValuation: number | null;
    partExchangeValuation: number | null;
    privateValuation: number | null;
  }>({
    derivative: null,
    generation: null,
    trim: null,
    atDerivativeId: null,
    retailValuation: null,
    tradeValuation: null,
    partExchangeValuation: null,
    privateValuation: null,
  });
  // SPEC Points 6/7 — dealer partner picker (shown when source = Dealer).
  const searchParams = useSearchParams();
  const [partners, setPartners] = useState<DealerPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    searchParams.get("dealerPartner") ?? "",
  );
  // GEN-81 — employee list for the "Received By" type-ahead.
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!company) return;
    void dealerPartnerService
      .getAll(company.id)
      .then((p) => setPartners(p.filter((x) => x.active)));
  }, [company]);

  useEffect(() => {
    if (!company) return;
    void teamService.getAll(company.id).then(setUsers);
  }, [company]);

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      // Pre-fill reg + mileage when arriving from the "Add Vehicle" modal
      // (`?reg=…&mileage=…`). With both present up front, the auto-lookup
      // below runs once with mileage → AutoTrader valuations come back.
      legacySerialNumber: undefined,
      registration: (searchParams.get("reg") ?? "").toUpperCase(),
      make: "",
      model: "",
      variantName: "",
      variantCode: "",
      year: undefined,
      colour: "",
      mileage: searchParams.get("mileage") ?? "",
      vehicleType: "car",
      bodyType: "hatchback",
      fuelType: "petrol",
      transmission: "manual",
      engineSizeCC: undefined,
      sellerName: "",
      sellerPhone: "",
      purchaseSource: searchParams.get("dealerPartner") ? "dealer" : "auction",
      localOrImport: "local",
      auctionHouse: "",
      ownedBy: "",
      ownerDetails: "",
      managedBy: user?.id ?? "",
      invoiceDate: today,
      creditNoteDate: "",
      financeProvider: "none",
      // Costs start blank, not £0: "not entered yet" and "free" differ, and a
      // blank saves as empty on the sheet exactly like an untouched cell.
      buyingPrice: undefined,
      vatOnBuyingPrice: undefined,
      buyersFee: undefined,
      vatOnBuyersFee: undefined,
      inspectionCharge: undefined,
      vatOnInspectionCharge: undefined,
      evAssuredCharge: undefined,
      vatOnEvAssuredCharge: undefined,
      batteryReportFee: undefined,
      vatOnBatteryReportFee: undefined,
      lateStorageFee: undefined,
      vatOnLateStorageFee: undefined,
      collectionFee: undefined,
      vatOnCollectionFee: undefined,
      deliveryFee: undefined,
      vatOnDeliveryFee: undefined,
      otherCharges: undefined,
      receivedDate: today,
      receivedBy: user?.id ?? "",
      logBook: "",
      euroStatus: "",
      engineSizeKw: undefined,
      numSeats: undefined,
      formerKeepers: undefined,
      numKeys: undefined,
      massInService: undefined,
      vin: "",
      engineNumber: "",
      serviceHistory: "unknown",
      lockNut: false,
      otherItemsReceived: "",
      motExpiry: "",
      warrantyCost: undefined,
      minimumSalePrice: undefined,
      listingPrice: undefined,
    },
    mode: "onTouched",
  });

  const watchAll = form.watch();
  const errors = form.formState.errors;

  // Holds the AbortController for the in-flight lookup so a newer lookup can
  // cancel an older one. Cancelled lookups exit without touching state.
  const inflightLookupRef = useRef<AbortController | null>(null);
  // The last cleaned reg we kicked off a lookup for. onBlur + onClick on the
  // same reg are coalesced — we don't double-fire the same call.
  const lastLookupRegRef = useRef<string>("");
  // When the loading state started; lets us render "Checking… (Ns)" so the
  // user can see the lookup is still progressing on a slow DVLA call.
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  // Tick the elapsed-time display once per 500ms while loading.
  const [, setLoadingTick] = useState(0);
  useEffect(() => {
    if (loadingStartedAt === null) return;
    const id = setInterval(() => setLoadingTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [loadingStartedAt]);

  async function handleDvlaLookup(regOverride?: string) {
    // Prefer an explicit reg (passed by the param-change auto-lookup, which
    // can't rely on form.setValue having flushed yet) over the form value.
    const reg = regOverride ?? form.getValues("registration");
    // Skip lookups while the user is still typing — UK plates are 4-8 chars
    // (with optional space). Anything shorter is mid-typing; anything longer
    // is junk. The DVLA route rejects anything that doesn't match
    // /^[A-Z0-9]{1,8}$/ after space-stripping; we mirror that guard here so
    // the lookup never fires with obviously bad input.
    const cleaned = (reg ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length < 4 || cleaned.length > 8) {
      setDvlaState("idle");
      setDuplicate(null);
      lastLookupRegRef.current = "";
      return;
    }

    // Coalesce double-fire: clicking the DVLA button also blurs the Input,
    // so onBlur AND onClick both call this for the same reg. Skip the
    // second invocation if we just kicked off the same lookup.
    //
    // The coalesce key includes mileage: the reg blur often fires first with
    // mileage still 0 (taxonomy + MOT come back, but AutoTrader can't value a
    // car without mileage). Once the user enters mileage and clicks DVLA, the
    // key changes, so the valuation-aware lookup is NOT coalesced away.
    const mileageKey = Number(form.getValues("mileage")) || 0;
    const coalesceKey = `${cleaned}:${mileageKey}`;
    if (lastLookupRegRef.current === coalesceKey) return;
    lastLookupRegRef.current = coalesceKey;

    // Abort any previous in-flight lookup so its fetches free up. We treat
    // an aborted signal as "a newer lookup is in charge now" — its results
    // are ignored on return.
    inflightLookupRef.current?.abort();
    const controller = new AbortController();
    inflightLookupRef.current = controller;
    const { signal } = controller;

    setDvlaState("loading");
    setDvlaMatched(false);
    setDuplicate(null);
    setLoadingStartedAt(Date.now());

    const formatted = formatRegPlate(reg ?? "");
    let landedTerminal = false;

    // Hard ceiling on the WHOLE lookup. If we don't land on a terminal
    // state in 15s, force the form out of "loading" so the spinner can
    // never stick. Defence-in-depth alongside dvla-service's own 12s
    // AbortController + the 5s Supabase race below.
    //
    // NB: we set not_found DIRECTLY here rather than only aborting the
    // controller — the finally block's safety-net skips when signal.aborted
    // is true, so a bare abort() would leave the spinner spinning forever
    // (the production "just keeps searching" bug).
    const ceiling = setTimeout(() => {
      if (!landedTerminal) {
        console.warn("[arrival-form] lookup ceiling hit (15s) — forcing not_found");
        landedTerminal = true;
        setDvlaState("not_found");
        setLoadingStartedAt(null);
      }
      controller.abort();
    }, 15_000);

    try {
      // dbPromise races against a 5s deadline. If Supabase doesn't respond
      // in 5s, treat as "no duplicate" and continue with the DVLA result.
      // The user occasionally won't see a duplicate banner under pathological
      // DB slowness, but the form stays usable. The existing submit-time
      // duplicate check (onSubmit, below) is the safety net for that case.
      const dbPromise = Promise.race([
        vehicleService.getByRegistration(formatted).catch((e) => {
          console.warn("[arrival-form] getByRegistration failed", e);
          return null;
        }),
        new Promise<null>((r) => setTimeout(() => r(null), 5_000)),
      ]);
      // Pass the entered mileage so AutoTrader can return valuations (it
      // can't value a car without one). Mileage of 0 / blank → no valuation,
      // but taxonomy (model/derivative) still comes back.
      const mileageNow = Number(form.getValues("mileage")) || undefined;
      const dvlaPromise = dvlaService
        .lookup(formatted, { mileage: mileageNow })
        .catch((e) => {
          console.warn("[arrival-form] vehicle lookup failed", e);
          return null;
        });

      // 1. Settle the DB check first (or its 5s deadline).
      const existing = await dbPromise;
      if (signal.aborted) return;

      if (existing) {
        setDuplicate({
          id: existing.id,
          stockId: existing.stockId,
          label: `${existing.make} ${existing.model ?? ""}`.trim(),
        });
        // NB: do NOT return here. Even for a car already in the stock book we
        // still want DVLA + AutoTrader to populate the form so the user can
        // review the pulled make/model/compliance data — previously the early
        // return left every field blank under the "already in stock" banner.
      }

      // 2. Wait for DVLA (runs whether or not it's a duplicate).
      const dvla = await dvlaPromise;
      if (signal.aborted) return;

      // Terminal state: a duplicate keeps its banner; otherwise found /
      // not_found reflects whether DVLA returned anything.
      if (existing) {
        setDvlaState("duplicate");
      } else if (!dvla) {
        setDvlaState("not_found");
        landedTerminal = true;
        return;
      } else {
        setDvlaState("found");
      }
      landedTerminal = true;

      // Duplicate with no DVLA hit: banner is shown, nothing to fill.
      if (!dvla) return;

      // Auto-fill from the combined DVLA + DVSA payload. Null / undefined
      // checks (not truthy) so legitimate zero values — e.g. engineSizeCC=0
      // for electric cars, or co2Emissions=0 for some EVs — still populate.
      if (dvla.make) form.setValue("make", dvla.make);
      // AutoTrader taxonomy → the Variant fields + Body/Transmission selects.
      // DVLA returns none of these; without them the form left Variant Name /
      // Variant Code blank and Body/Transmission on their defaults.
      // Only fill a blank variant name. VARIANT CODE is typed from the BCA
      // invoice (sheet col F) — the AutoTrader derivative id is kept on its
      // own field (atDerivativeId), never written into it.
      if (dvla.derivative && !form.getValues("variantName")?.trim()) {
        form.setValue("variantName", dvla.derivative);
      }
      if (dvla.bodyType) form.setValue("bodyType", dvla.bodyType);
      if (dvla.transmission) form.setValue("transmission", dvla.transmission);
      if (dvla.vehicleType) form.setValue("vehicleType", dvla.vehicleType);
      // Don't overwrite a user-typed model with DVLA's null. DVLA VES
      // never returns model, but if a future version does we still respect
      // any value already in the field.
      const currentModel = form.getValues("model");
      if (dvla.model && !currentModel?.trim()) form.setValue("model", dvla.model);
      if (dvla.year != null) form.setValue("year", String(dvla.year));
      if (dvla.colour) form.setValue("colour", dvla.colour);
      if (dvla.fuelType) form.setValue("fuelType", dvla.fuelType);
      if (dvla.engineSizeCC != null) form.setValue("engineSizeCC", String(dvla.engineSizeCC));
      if (dvla.motExpiry) form.setValue("motExpiry", dvla.motExpiry);
      // Sheet col AO — the receiving step shows it, pre-filled from DVLA.
      if (dvla.euroStatus && !form.getValues("euroStatus")?.trim()) {
        form.setValue("euroStatus", dvla.euroStatus);
      }

      // Module-F — populate the Compliance & Verification card with the
      // 8 additional fields the route now returns. Each value is taken
      // verbatim (the merge rule lives server-side in /api/vehicle/lookup).
      setCompliance({
        registrationDate: dvla.registrationDate ?? null,
        co2Emissions: dvla.co2Emissions ?? null,
        euroStatus: dvla.euroStatus ?? null,
        taxStatus: dvla.taxStatus ?? null,
        taxDueDate: dvla.taxDueDate ?? null,
        motStatus: dvla.motStatus ?? null,
        motExpiryDate: dvla.motExpiry ?? null,
        wheelplan: dvla.wheelplan ?? null,
        automatedVehicle: dvla.automatedVehicle ?? null,
        dateOfLastV5CIssued: dvla.dateOfLastV5CIssued ?? null,
      });
      setComplianceSources(dvla.sources);
      setMotSource(dvla.motSource ?? null);
      setVerifiedAt(new Date());
      setDvlaMatched(true);

      // AutoTrader taxonomy + valuation. Fill the model from AutoTrader when
      // the user hasn't typed one (DVLA returns model=null). Derivative /
      // generation / trim are captured for persistence + display.
      setAtData({
        derivative: dvla.derivative ?? null,
        generation: dvla.generation ?? null,
        trim: dvla.trim ?? null,
        atDerivativeId: dvla.atDerivativeId ?? null,
        retailValuation: dvla.retailValuation ?? null,
        tradeValuation: dvla.tradeValuation ?? null,
        partExchangeValuation: dvla.partExchangeValuation ?? null,
        privateValuation: dvla.privateValuation ?? null,
      });
      // dvla.model already carries AutoTrader's model after the route merge;
      // the guard above only writes it when the model field is empty.
    } catch (e) {
      console.warn("[arrival-form] handleDvlaLookup unexpected", e);
      if (!signal.aborted) {
        setDvlaState("not_found");
        landedTerminal = true;
      }
    } finally {
      clearTimeout(ceiling);
      // Safety net: if we exited without setting a terminal state AND we
      // weren't aborted by a newer lookup, force not_found so the loading
      // spinner can never stick forever.
      if (!landedTerminal && !signal.aborted) {
        setDvlaState("not_found");
      }
      setLoadingStartedAt(null);
    }
  }

  // Auto-run the lookup when arriving from the Add Vehicle modal with a
  // `?reg=` param — AND re-run it if the param CHANGES while the page is
  // already mounted (the modal navigates add-vehicle?reg=A → add-vehicle?reg=B
  // without remounting, so a one-shot mount effect would never re-fire and the
  // form would keep showing the old car). We track the last reg we looked up
  // and re-seed the reg/mileage fields before kicking off the new lookup.
  const lastAutoLookupRegRef = useRef<string>("");
  useEffect(() => {
    const regParam = (searchParams.get("reg") ?? "").trim().toUpperCase();
    if (!regParam) return;
    if (lastAutoLookupRegRef.current === regParam) return;
    lastAutoLookupRegRef.current = regParam;

    // Re-seed the form's reg + mileage from the new query params so the rest
    // of the form (and submit) sees the latest values.
    form.setValue("registration", regParam);
    const mileageParam = Number(searchParams.get("mileage"));
    if (Number.isFinite(mileageParam) && mileageParam > 0) {
      form.setValue("mileage", String(Math.round(mileageParam)));
    }
    // Pass regParam explicitly — setValue above may not have flushed into
    // form state yet, and handleDvlaLookup() otherwise reads the stale reg.
    void handleDvlaLookup(regParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function addTodo() {
    if (!newTodo.description.trim()) return;
    setTodos((t) => [...t, { ...newTodo }]);
    setNewTodo({ description: "", cost: 0 });
  }

  function removeTodo(idx: number) {
    setTodos((t) => t.filter((_, i) => i !== idx));
  }

  // Live cost rollups — the same formula the saved record uses
  // (vehicle-costs.ts), so the receipt can't disagree with the Master Sheet.
  const amount = (v: unknown): number | null => {
    const x = Number(v);
    return v === "" || v === undefined || v === null || !Number.isFinite(x) ? null : x;
  };
  const prepCosts = todos.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);
  const costInputs: VehicleCostInputs = {
    buyingPrice: amount(watchAll.buyingPrice) ?? 0,
    vatOnBuyingPrice: amount(watchAll.vatOnBuyingPrice),
    buyersFee: amount(watchAll.buyersFee),
    vatOnBuyersFee: amount(watchAll.vatOnBuyersFee),
    inspectionCharge: amount(watchAll.inspectionCharge),
    vatOnInspectionCharge: amount(watchAll.vatOnInspectionCharge),
    evAssuredCharge: amount(watchAll.evAssuredCharge),
    vatOnEvAssuredCharge: amount(watchAll.vatOnEvAssuredCharge),
    batteryReportFee: amount(watchAll.batteryReportFee),
    vatOnBatteryReportFee: amount(watchAll.vatOnBatteryReportFee),
    lateStorageFee: amount(watchAll.lateStorageFee),
    vatOnLateStorageFee: amount(watchAll.vatOnLateStorageFee),
    collectionFee: amount(watchAll.collectionFee),
    vatOnCollectionFee: amount(watchAll.vatOnCollectionFee),
    deliveryFee: amount(watchAll.deliveryFee),
    vatOnDeliveryFee: amount(watchAll.vatOnDeliveryFee),
    otherCharges: amount(watchAll.otherCharges),
    loadingFee: 0,
    unloadingFee: 0,
    stockingCharges: 0,
    valueAddition: prepCosts,
    warrantyCost: amount(watchAll.warrantyCost),
  };
  const { totalBuyingPrice, landedCost, baseCost } = computeCostTotals(costInputs);
  const buyingPrice = costInputs.buyingPrice;
  const warrantyCost = costInputs.warrantyCost ?? 0;
  // The receipt's "fees & charges" line: AI minus the price (fees + VAT paid).
  const fees = totalBuyingPrice - buyingPrice;

  async function onSubmit(values: FormInput) {
    if (!user || !company) return;
    setSubmitting(true);
    // (errors are rendered inline below each field via form.formState.errors)
    // An unregistered car has no reg to look up — it is saved as UNREGISTERED
    // (client, 18 Sep 2026) and skips the duplicate check, which would
    // otherwise match every other unregistered car.
    const typedReg = (values.registration ?? "").trim();
    const reg = typedReg ? formatRegPlate(typedReg) : UNREGISTERED;
    // v4.1 TC-P6-004: warn when a registration is already in the master sheet
    // (don't block — the user may want to bring back a returned/removed vehicle).
    const existing = typedReg ? await vehicleService.getByRegistration(reg) : null;
    if (existing) {
      const proceed = await confirm({
        title: "Registration already on the Master Sheet",
        description: `${reg} already exists (${existing.stockId}, ${existing.make} ${existing.model}). Add anyway?`,
        confirmText: "Add anyway",
      });
      if (!proceed) {
        setSubmitting(false);
        return;
      }
    }
    try {
      const v = await vehicleService.create(
        {
          companyId: company.id,
          registration: reg,
          tagNumber: null,
          make: (values.make ?? "").trim().toUpperCase(),
          model: (values.model ?? "").trim().toUpperCase(),
          variantName: values.variantName?.trim() || null,
          variantCode: values.variantCode?.trim() || null,
          // year is NOT NULL on the record; an unknown year falls back to the
          // DVLA registration year, then to this year, and stays editable.
          year:
            opt(values.year) ??
            (compliance.registrationDate
              ? Number(compliance.registrationDate.slice(0, 4))
              : new Date().getFullYear()),
          colour: (values.colour ?? "").trim().toUpperCase(),
          mileage: opt(values.mileage) ?? 0,
          vehicleType: values.vehicleType,
          bodyType: values.bodyType,
          fuelType: values.fuelType,
          transmission: values.transmission,
          engineSizeCC: opt(values.engineSizeCC),
          receivedDate: values.receivedDate || today,
          receivedBy: values.receivedBy || user.id,
          sellerName: values.sellerName?.trim() ?? "",
          sellerPhone: values.sellerPhone ?? "",
          purchaseSource: values.purchaseSource === "trade_in" ? "trade_in" : values.purchaseSource,
          purchaseChannel: "supplier",
          supplierId: null,
          customFields: {},
          localOrImport: values.localOrImport,
          auctionHouse: values.auctionHouse || null,
          ownedBy: values.ownedBy?.trim().toUpperCase() || null,
          ownerDetails: values.ownerDetails?.trim().toUpperCase() || null,
          managedBy: values.managedBy || user.id,
          invoiceDate: values.invoiceDate || null,
          creditNoteDate: values.creditNoteDate || null,
          // AN — log book text, with the V5 flag kept in step.
          ...logBookPatch(values.logBook ?? null),
          serviceHistory: values.serviceHistory,
          numKeys: opt(values.numKeys) ?? 0,
          lockNut: values.lockNut,
          motExpiry: values.motExpiry || compliance.motExpiryDate || null,
          vin: values.vin?.trim().toUpperCase() || null,
          firstRegisteredDate: compliance.registrationDate,
          legacySerialNumber: opt(values.legacySerialNumber),
          engineSizeKw: opt(values.engineSizeKw),
          numSeats: opt(values.numSeats),
          formerKeepers: opt(values.formerKeepers),
          massInService: opt(values.massInService),
          engineNumber: values.engineNumber?.trim().toUpperCase() || null,
          otherItemsReceived: values.otherItemsReceived?.trim() || null,
          saleStatus: "available",
          // Module-F compliance fields — populated by /api/vehicle/lookup
          // and persisted alongside the manually-entered data.
          co2Emissions: compliance.co2Emissions,
          euroStatus: values.euroStatus?.trim() || compliance.euroStatus,
          taxStatus: compliance.taxStatus,
          taxDueDate: compliance.taxDueDate,
          motStatus: compliance.motStatus,
          wheelplan: compliance.wheelplan,
          automatedVehicle: compliance.automatedVehicle,
          dateOfLastV5CIssued: compliance.dateOfLastV5CIssued,
          // AutoTrader taxonomy + valuation (migration 0018)
          derivative: atData.derivative,
          generation: atData.generation,
          trim: atData.trim,
          atDerivativeId: atData.atDerivativeId,
          atRetailValuation: atData.retailValuation,
          atTradeValuation: atData.tradeValuation,
          atPartExchangeValuation: atData.partExchangeValuation,
          atPrivateValuation: atData.privateValuation,
          atPriceIndicator: deriveAtPriceIndicator(
            values.listingPrice ? Number(values.listingPrice) : null,
            atData.retailValuation,
          ),
          atValuationAt: atData.retailValuation ? new Date().toISOString() : null,
          // Costs (sheet S–AH): exactly what was entered. VAT is VAT actually
          // paid — no longer auto-filled at 20% on every car.
          buyingPrice: costInputs.buyingPrice,
          vatOnBuyingPrice: costInputs.vatOnBuyingPrice ?? 0,
          buyersFee: costInputs.buyersFee,
          vatOnBuyersFee: costInputs.vatOnBuyersFee,
          inspectionCharge: costInputs.inspectionCharge,
          vatOnInspectionCharge: costInputs.vatOnInspectionCharge,
          evAssuredCharge: costInputs.evAssuredCharge,
          vatOnEvAssuredCharge: costInputs.vatOnEvAssuredCharge,
          batteryReportFee: costInputs.batteryReportFee,
          vatOnBatteryReportFee: costInputs.vatOnBatteryReportFee,
          lateStorageFee: costInputs.lateStorageFee,
          vatOnLateStorageFee: costInputs.vatOnLateStorageFee,
          collectionFee: costInputs.collectionFee,
          vatOnCollectionFee: costInputs.vatOnCollectionFee,
          deliveryFee: costInputs.deliveryFee,
          vatOnDeliveryFee: costInputs.vatOnDeliveryFee,
          otherCharges: costInputs.otherCharges,
          totalBuyingPrice,
          financeProvider: values.financeProvider,
          loadingFee: 0,
          dailyChargeRate: 0,
          unloadingFee: 0,
          stockingCharges: 0,
          // Re-summed from the saved to-dos straight after create.
          valueAddition: prepCosts,
          warrantyCost: costInputs.warrantyCost,
          landedCost,
          baseCost,
          minimumSalePrice: opt(values.minimumSalePrice),
          listingPrice: opt(values.listingPrice),
          sellingPrice: null,
          dateSold: null,
          sellingAgent: null,
          grossEarning: null,
          status: "received",
          removedFromWebsiteAt: null,
          daysInStock: 0,
          imagesCount: 0,
          heroImageUrl: null,
        },
        user.id,
      );
      // Persist any "Things to Do" added at arrival
      for (const t of todos) {
        await todoService.add({
          vehicleId: v.id,
          description: t.description,
          vendorId: null,
          cost: t.cost || null,
          source: "manual",
          createdBy: user.id,
        });
      }
      // SPEC Point 7 — link the vehicle to its dealer partner (guarded;
      // no-ops if supplier_id / dealer_partners aren't migrated).
      if (values.purchaseSource === "dealer" && selectedPartnerId) {
        await dealerPartnerService.assignSupplier(v.id, selectedPartnerId);
      }
      toast.success(`Vehicle ${v.stockId} added`);
      router.push(vehicleDetailHref(v.id, pathname));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  // A step is complete once every red-asterisk field in its section is filled
  // (a prompt only, never blocking). Pricing has none, so it never shows one.
  const important: [label: string, value: unknown, section: SectionId][] = [
    ["Registration", watchAll.registration, "identity"],
    ["Make", watchAll.make, "identity"],
    ["Model", watchAll.model, "identity"],
    ["Colour", watchAll.colour, "identity"],
    ["Mileage", watchAll.mileage, "identity"],
    ["Seller", watchAll.sellerName, "buying"],
    ["Auction house", watchAll.auctionHouse, "buying"],
    ["Owned by", watchAll.ownedBy, "buying"],
    ["Invoice date", watchAll.invoiceDate, "buying"],
    ["Buying price", watchAll.buyingPrice, "costs"],
    ["Receiving date", watchAll.receivedDate, "receiving"],
    ["Log book", watchAll.logBook, "receiving"],
    ["No. of keys", watchAll.numKeys, "receiving"],
  ];
  const isBlankValue = (v: unknown) =>
    v === undefined || v === null || String(v).trim() === "";
  const stepperSections: StepperSection[] = SECTIONS.map((s) => {
    const fields = important.filter((f) => f[2] === s.id);
    return {
      anchorId: sectionId(s.id),
      title: s.title,
      hint: s.hint,
      complete: fields.length > 0 && fields.every(([, v]) => !isBlankValue(v)),
    };
  });

  // Unsaved = anything typed, picked or added since the page opened. While
  // it is, the save bar carries Save; otherwise the Page's primary does, so
  // there is only ever one primary action on screen.
  const unsaved = form.formState.isDirty || todos.length > 0;
  const save = () => void form.handleSubmit(onSubmit)();
  const submitFailed =
    form.formState.submitCount > 0 && Object.keys(errors).length > 0;
  const lookupFound =
    dvlaMatched && (dvlaState === "found" || dvlaState === "duplicate");

  return (
    <>
      {/* Polaris' unsaved-changes bar. It sits over the top bar (the Frame is
          its containing block), as in Shopify, so showing it never moves the
          page under the cursor. */}
      {unsaved && (
        <div className="fixed inset-x-0 top-0 z-40">
          <ContextualSaveBar
            message="Unsaved vehicle"
            saveAction={{ content: "Save vehicle", onAction: save, loading: submitting }}
            discardAction={{
              content: "Discard",
              onAction: () => {
                if (!submitting) router.push("/vehicles");
              },
            }}
          />
        </div>
      )}

      <Page
        title="Add vehicle"
        backAction={{ content: "Back to vehicles", url: "/vehicles" }}
        // No draft storage behind "Save as draft" yet; kept as it was.
        secondaryActions={[{ content: "Save as draft", disabled: submitting }]}
        primaryAction={
          unsaved
            ? undefined
            : { content: "Save vehicle", onAction: save, loading: submitting }
        }
      >
        <SectionStepper sections={stepperSections} endSentinelId={formEndId} />

        {/* Shopify product-form pattern: the section cards in the main
            column; the valuation and the live cost summary in the
            sidebar. One <form>, one onSubmit. */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Layout>
            <Layout.Section>
              {submitFailed && (
                <Banner tone="critical" title="Fix these errors">
                  <ul className="list-disc pl-5">
                    {Object.entries(errors).map(([field, err]) => (
                      <li key={field}>
                        <span className="font-mono">{field}</span>:{" "}
                        {(err as { message?: string })?.message ?? "invalid"}
                      </li>
                    ))}
                  </ul>
                </Banner>
              )}

              <div id={sectionId("identity")} className="flex flex-col gap-4">
                <RegistrationLookupCard
                  form={form}
                  fieldId={ids.registration}
                  dvlaState={dvlaState}
                  duplicate={duplicate}
                  duplicateHref={duplicate ? vehicleDetailHref(duplicate.id, pathname) : null}
                  loadingSeconds={
                    loadingStartedAt !== null
                      ? Math.max(0, Math.round((Date.now() - loadingStartedAt) / 1000))
                      : null
                  }
                  onLookup={() => void handleDvlaLookup()}
                />
                {lookupFound && (
                  <VehicleConfirmationCard
                    form={form}
                    inStock={dvlaState === "duplicate"}
                    onEdit={() => focusField(ids.make)}
                  />
                )}
                <IdentityCard form={form} ids={ids} auto={dvlaState === "found"} />
                {/* Compliance & Verification (DVLA + DVSA) */}
                <ComplianceCard
                  value={compliance}
                  onChange={(next) => setCompliance((curr) => ({ ...curr, ...next }))}
                  onRefetch={() => {
                    lastLookupRegRef.current = "";
                    void handleDvlaLookup();
                  }}
                  refetching={dvlaState === "loading"}
                  verifiedAt={verifiedAt}
                  sources={complianceSources}
                  motSource={motSource}
                />
              </div>

              <div id={sectionId("buying")} className="flex flex-col gap-4">
                <BuyingCard
                  form={form}
                  ids={ids}
                  partners={partners}
                  selectedPartnerId={selectedPartnerId}
                  onPartnerChange={setSelectedPartnerId}
                />
              </div>

              <div id={sectionId("costs")} className="flex flex-col gap-4">
                <PurchaseCostsCard form={form} totalBuyingPrice={totalBuyingPrice} />
              </div>

              <div id={sectionId("receiving")} className="flex flex-col gap-4">
                <ReceivingCard form={form} ids={ids} users={users} />
                <TodosCard
                  todos={todos}
                  newTodo={newTodo}
                  onNewTodoChange={setNewTodo}
                  onAdd={addTodo}
                  onRemove={removeTodo}
                  descriptionId={ids.newTodoDescription}
                  costId={ids.newTodoCost}
                />
              </div>

              <div id={sectionId("pricing")} className="flex flex-col gap-4">
                <PricingCard form={form} ids={ids} />
              </div>
            </Layout.Section>

            <StickySidebar
              pinned={
                <CostSummaryCard
                  buyingPrice={buyingPrice}
                  feesAndCharges={fees}
                  prepCosts={prepCosts}
                  warranty={warrantyCost}
                  otherCharges={costInputs.otherCharges ?? 0}
                  listingPrice={Number(watchAll.listingPrice) || null}
                />
              }
            >
              {atData.retailValuation != null && (
                <ValuationCard
                  mileage={Number(form.getValues("mileage"))}
                  retailValuation={atData.retailValuation}
                  tradeValuation={atData.tradeValuation}
                  partExchangeValuation={atData.partExchangeValuation}
                  onUseAsListingPrice={() => {
                    if (atData.retailValuation != null) {
                      form.setValue("listingPrice", String(atData.retailValuation));
                      toast.success(
                        `Listing price set to ${formatCurrency(atData.retailValuation)}`,
                      );
                    }
                  }}
                />
              )}
            </StickySidebar>
          </Layout>
          {/* Foot of the form: once in view, the stepper marks the last section. */}
          <div id={formEndId} aria-hidden />
        </form>

        {confirmDialog}
      </Page>
    </>
  );
}
