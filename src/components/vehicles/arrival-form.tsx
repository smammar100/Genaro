"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2, Search } from "lucide-react";
import { RegPlate } from "@/components/shared/reg-plate";
import {
  Banner,
  Button,
  Card,
  Checkbox,
  InlineError,
  Layout,
  Link as PolarisLink,
  Page,
  PageActions,
  Select,
  TextField,
} from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import {
  AUCTION_HOUSES,
  BODY_TYPES,
  FINANCE_PROVIDERS,
  FUEL_TYPES,
  VAT_RATE,
} from "@/lib/constants";
import { CostSummaryReceipt } from "./cost-summary-receipt";
import {
  computeCostTotals,
  type VehicleCostInputs,
} from "@/lib/vehicle-costs";
import {
  AUCTION_HOUSE_SUGGESTIONS,
  LOG_BOOK_SUGGESTIONS,
  OWNED_BY_SUGGESTIONS,
  VEHICLE_CATEGORY_OPTIONS,
  logBookPatch,
  vehicleCategory,
  vehicleCategoryPatch,
} from "@/lib/master-sheet";
import {
  ComplianceCard,
  type ComplianceCardValue,
} from "./compliance-card";
import { toast } from "@/lib/toast";
import { cn, formatCurrency, formatRegPlate } from "@/lib/utils";

// v4.1 spec §11.3 — Add Vehicle arrival form. A guided 5-step wizard
// (Variation E) laid out as a Polaris product form: a Page with the step's
// cards in the main column and a sidebar holding the step list, AutoTrader
// valuation and a live cost summary. The form stays a single <form> with one
// onSubmit; sections are grouped into steps and RHF keeps field values
// across step changes.

const SOURCE_OPTIONS = [
  { value: "auction", label: "Auction" },
  { value: "private", label: "Private seller" },
  { value: "trade_in", label: "Trade-in" },
  { value: "dealer", label: "Dealer" },
  { value: "other", label: "Other" },
] as const;

const SERVICE_HISTORY_OPTIONS = [
  { value: "full", label: "Full" },
  { value: "partial", label: "Partial" },
  { value: "none", label: "None" },
  { value: "unknown", label: "Unknown" },
] as const;

const TRANSMISSION_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
] as const;

const STEPS: { id: string; title: string; hint: string }[] = [
  { id: "identity", title: "Vehicle identity", hint: "Reg lookup and specs" },
  { id: "source", title: "Buying", hint: "Seller, owner, invoice" },
  { id: "costs", title: "Purchase costs", hint: "Price, fees, VAT" },
  { id: "finish", title: "Receiving", hint: "Arrival, paperwork, to-dos" },
  { id: "review", title: "Review and submit", hint: "Confirm and save" },
];

/**
 * A blank number input arrives as "" — treat it as "not entered" rather than
 * letting z.coerce turn it into 0 or NaN.
 */
const isBlank = (v: string | undefined) => v === undefined || v.trim() === "";
const optionalNumber = z
  .string()
  .optional()
  .refine((v) => isBlank(v) || Number(v) >= 0, "Enter an amount of 0 or more");
const optionalInt = z
  .string()
  .optional()
  .refine(
    (v) => isBlank(v) || (Number.isInteger(Number(v)) && Number(v) >= 0),
    "Enter a whole number",
  );

/**
 * The arrival questionnaire. NOTHING is mandatory (client, 18 Sep 2026): an
 * unregistered car has no reg and no DVLA data, and whoever is entering the
 * car may not have every answer to hand. Important fields carry a red
 * asterisk as a prompt only; everything can be completed later on the
 * vehicle page or the Master Sheet. The only checks left are ones that catch
 * a typo (a negative price, a year of 20019).
 *
 * Field order follows the master sheet's sections — docs/master-sheet-spec.md.
 */
const schema = z.object({
  // Step 1 — Vehicle identity (sheet B–K)
  legacySerialNumber: optionalInt,
  registration: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  variantName: z.string().optional(),
  variantCode: z.string().optional(),
  year: z
    .string()
    .optional()
    .refine(
      (v) => isBlank(v) || (Number.isInteger(Number(v)) && Number(v) >= 1900 && Number(v) <= 2100),
      "Check the year",
    ),
  colour: z.string().optional(),
  mileage: optionalInt,
  vehicleType: z.enum(["car", "van"]),
  bodyType: z.enum(["hatchback", "saloon", "suv", "mpv", "estate", "convertible", "coupe"]),
  fuelType: z.enum(["petrol", "diesel", "hybrid", "electric"]),
  transmission: z.enum(["manual", "automatic"]),
  engineSizeCC: optionalInt,

  // Step 2 — Buying (sheet L–P + seller)
  sellerName: z.string().optional(),
  sellerPhone: z.string().optional(),
  purchaseSource: z.enum(["auction", "private", "trade_in", "dealer", "other"]),
  localOrImport: z.enum(["local", "import"]),
  auctionHouse: z.string().optional(),
  ownedBy: z.string().optional(),
  ownerDetails: z.string().optional(),
  managedBy: z.string().optional(),
  invoiceDate: z.string().optional(),
  creditNoteDate: z.string().optional(),
  financeProvider: z.enum(["none", "next_gear", "close_brothers", "bca", "infinit"]),

  // Step 3 — Purchase costs (sheet S–AH): each fee and the VAT paid on it
  buyingPrice: optionalNumber,
  vatOnBuyingPrice: optionalNumber,
  buyersFee: optionalNumber,
  vatOnBuyersFee: optionalNumber,
  inspectionCharge: optionalNumber,
  vatOnInspectionCharge: optionalNumber,
  evAssuredCharge: optionalNumber,
  vatOnEvAssuredCharge: optionalNumber,
  batteryReportFee: optionalNumber,
  vatOnBatteryReportFee: optionalNumber,
  lateStorageFee: optionalNumber,
  vatOnLateStorageFee: optionalNumber,
  collectionFee: optionalNumber,
  vatOnCollectionFee: optionalNumber,
  deliveryFee: optionalNumber,
  vatOnDeliveryFee: optionalNumber,
  otherCharges: optionalNumber,

  // Step 4 — Receiving (sheet AJ–BA)
  receivedDate: z.string().optional(),
  receivedBy: z.string().optional(),
  logBook: z.string().optional(),
  euroStatus: z.string().optional(),
  engineSizeKw: optionalInt,
  numSeats: optionalInt,
  formerKeepers: optionalInt,
  numKeys: optionalInt,
  massInService: optionalInt,
  vin: z.string().optional(),
  engineNumber: z.string().optional(),
  serviceHistory: z.enum(["full", "partial", "none", "unknown"]),
  lockNut: z.boolean(),
  otherItemsReceived: z.string().optional(),
  motExpiry: z.string().optional(),

  // Pricing (optional)
  warrantyCost: optionalNumber,
  minimumSalePrice: optionalNumber,
  listingPrice: optionalNumber,
});

type FormInput = z.input<typeof schema>;

/** Registration saved for a car that has none yet (client, 18 Sep 2026). */
const UNREGISTERED = "UNREGISTERED";

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

export function ArrivalForm() {
  const baseId = useId();
  const registrationFieldId = `${baseId}-registration`;
  const mileageFieldId = `${baseId}-mileage`;
  const makeFieldId = `${baseId}-make`;
  const modelFieldId = `${baseId}-model`;
  const variantNameFieldId = `${baseId}-variant-name`;
  const variantCodeFieldId = `${baseId}-variant-code`;
  const yearFieldId = `${baseId}-year`;
  const colourFieldId = `${baseId}-colour`;
  const vehicleTypeFieldId = `${baseId}-vehicle-type`;
  const bodyTypeFieldId = `${baseId}-body-type`;
  const fuelTypeFieldId = `${baseId}-fuel-type`;
  const transmissionFieldId = `${baseId}-transmission`;
  const engineSizeFieldId = `${baseId}-engine-size`;
  const motExpiryFieldId = `${baseId}-mot-expiry`;
  const sellerNameFieldId = `${baseId}-seller-name`;
  const sellerPhoneFieldId = `${baseId}-seller-phone`;
  const sourceTypeFieldId = `${baseId}-source-type`;
  const dealerPartnerFieldId = `${baseId}-dealer-partner`;
  const localOrImportFieldId = `${baseId}-local-or-import`;
  const auctionHouseFieldId = `${baseId}-auction-house`;
  const ownedByFieldId = `${baseId}-owned-by`;
  const invoiceDateFieldId = `${baseId}-invoice-date`;
  const legacySerialFieldId = `${baseId}-legacy-serial`;
  const ownerDetailsFieldId = `${baseId}-owner-details`;
  const creditNoteDateFieldId = `${baseId}-credit-note-date`;
  const logBookFieldId = `${baseId}-log-book`;
  const euroStatusFieldId = `${baseId}-euro-status`;
  const engineSizeKwFieldId = `${baseId}-engine-size-kw`;
  const numSeatsFieldId = `${baseId}-num-seats`;
  const formerKeepersFieldId = `${baseId}-former-keepers`;
  const massFieldId = `${baseId}-mass-in-service`;
  const vinFieldId = `${baseId}-vin`;
  const engineNumberFieldId = `${baseId}-engine-number`;
  const otherItemsFieldId = `${baseId}-other-items`;
  const serviceHistoryFieldId = `${baseId}-service-history`;
  const numKeysFieldId = `${baseId}-num-keys`;
  const lockNutFieldId = `${baseId}-lock-nut`;
  const financeProviderFieldId = `${baseId}-finance-provider`;
  const receivedDateFieldId = `${baseId}-received-date`;
  const receivedByFieldId = `${baseId}-received-by`;
  const newTodoDescriptionFieldId = `${baseId}-new-todo-description`;
  const newTodoCostFieldId = `${baseId}-new-todo-cost`;
  const warrantyCostFieldId = `${baseId}-warranty-cost`;
  const minimumSalePriceFieldId = `${baseId}-minimum-sale-price`;
  const listingPriceFieldId = `${baseId}-listing-price`;
  const { user, company } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, confirmDialog } = useConfirm();
  const [submitting, setSubmitting] = useState(false);
  // Variation E — guided wizard. Sections are grouped into 5 steps; fields
  // stay registered across step changes (RHF keeps values, shouldUnregister
  // is false), so the single onSubmit still validates the whole form.
  const [step, setStep] = useState(0);
  // dvlaState drives the inline status shown under the registration field.
  //  - idle         : nothing has been looked up yet
  //  - loading      : lookup in flight
  //  - found        : DVLA returned data and the form has been auto-filled
  //  - not_found    : DVLA didn't recognise this reg, or the format was invalid
  //  - duplicate    : we already have this reg in our stock book (we don't
  //                   even call DVLA — we show the user where to find it)
  const [dvlaState, setDvlaState] = useState<
    "idle" | "loading" | "found" | "not_found" | "duplicate"
  >("idle");
  // Populated only when dvlaState === "duplicate"
  const [duplicate, setDuplicate] = useState<{
    id: string;
    stockId: string;
    label: string;
  } | null>(null);
  const [todos, setTodos] = useState<{ description: string; cost: number }[]>([]);
  const [newTodo, setNewTodo] = useState({ description: "", cost: 0 });

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

  const watchedSource = form.watch("purchaseSource");
  // The red-asterisk fields still blank — listed on Review, never blocking.
  const missingImportant = (
    [
      ["Registration", watchAll.registration],
      ["Make", watchAll.make],
      ["Model", watchAll.model],
      ["Colour", watchAll.colour],
      ["Mileage", watchAll.mileage],
      ["Seller", watchAll.sellerName],
      ["Auction house", watchAll.auctionHouse],
      ["Owned by", watchAll.ownedBy],
      ["Invoice date", watchAll.invoiceDate],
      ["Buying price", watchAll.buyingPrice],
      ["Receiving date", watchAll.receivedDate],
      ["Log book", watchAll.logBook],
      ["No. of keys", watchAll.numKeys],
    ] as [string, unknown][]
  )
    .filter(([, v]) => v === undefined || v === null || String(v).trim() === "")
    .map(([label]) => label);
  const regClean = (watchAll.registration ?? "").replace(/[^A-Za-z0-9]/g, "");
  const isLast = step === STEPS.length - 1;
  const go = (n: number) => setStep(Math.min(STEPS.length - 1, Math.max(0, n)));

  return (
    <Page
      title="Add vehicle"
      subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].title}`}
      backAction={{ content: "Back to vehicles", url: "/vehicles" }}
    >
      {/* Shopify product-form pattern: step cards in the main column, the
          step list, valuation and live cost summary in the sidebar. The form
          stays a single <form> with one onSubmit; RHF keeps field values
          across step changes. */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Layout>
          <Layout.Section>
            {/* Validation summary (surfaced on the review step) */}
            {isLast && Object.keys(errors).length > 0 && (
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

            {/* ───────────────────────────── STEP 1 — Identity ── */}
            {step === 0 && (
              <>
                {/* Reg lookup */}
                <Card title="Registration lookup">
                  <p className="text-sm text-(--text-secondary)">
                    Typing the registration auto-checks your stock book and
                    pre-fills make, year, colour and fuel from DVLA.
                  </p>
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <Label htmlFor={registrationFieldId}>
                        Registration <Important />
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-52">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--icon-secondary)" />
                          <Input
                            id={registrationFieldId}
                            {...form.register("registration")}
                            onBlur={() => void handleDvlaLookup()}
                            placeholder="GK66 6NX"
                            className="pl-9 font-mono uppercase tracking-wider"
                          />
                        </div>
                        <Button
                          icon={dvlaState === "loading" ? undefined : "WandMinor"}
                          onClick={() => void handleDvlaLookup()}
                          loading={dvlaState === "loading"}
                        >
                          Fetch DVLA
                        </Button>
                      </div>
                    </div>
                    {regClean.length >= 4 && (
                      <RegPlate
                        registration={watchAll.registration ?? ""}
                        size="lg"
                        className="ml-auto"
                      />
                    )}
                  </div>
                  {dvlaState === "idle" && (
                    <p className="text-xs text-(--text-secondary)">
                      No registration yet? Leave it blank and the car is saved
                      as {UNREGISTERED}. You can add the reg later.
                    </p>
                  )}
                  {dvlaState === "loading" && (
                    <p className="flex items-center gap-1 text-xs text-(--text-secondary)">
                      <Loader2 className="size-3 animate-spin" />
                      Checking DVLA and your stock book
                      {loadingStartedAt !== null
                        ? ` (${Math.max(0, Math.round((Date.now() - loadingStartedAt) / 1000))}s)`
                        : ""}
                      …
                    </p>
                  )}
                  {dvlaState === "found" && (
                    <Banner tone="success">
                      Matched: make / model / derivative, tax, MOT and
                      valuation auto-filled from DVLA + AutoTrader.
                    </Banner>
                  )}
                  {dvlaState === "not_found" && (
                    <Banner tone="warning">
                      The number is incorrect. Try again, or fill in the form
                      manually.
                    </Banner>
                  )}
                  {dvlaState === "duplicate" && duplicate && (
                    <Banner tone="info">
                      This car is already in your stock book as{" "}
                      <PolarisLink url={vehicleDetailHref(duplicate.id, pathname)}>
                        {duplicate.stockId}
                      </PolarisLink>
                      {duplicate.label ? ` (${duplicate.label})` : ""}.
                    </Banner>
                  )}
                </Card>

                {/* Identity fields */}
                <Card title="Vehicle identity">
                  <p className="text-sm text-(--text-secondary)">
                    Auto-filled from DVLA + AutoTrader
                  </p>
                  <div className="mt-2 grid gap-4 sm:grid-cols-2">
                    <Field
                      label={<>Mileage <Important /></>}
                      htmlFor={mileageFieldId}
                      error={errors.mileage?.message}
                    >
                      <Input id={mileageFieldId} type="number" min={0} {...form.register("mileage")} />
                    </Field>
                    <Field label={<>Make <Important /></>} htmlFor={makeFieldId} auto={dvlaState === "found"}>
                      <Input id={makeFieldId} {...form.register("make")} />
                    </Field>
                    <Field label={<>Model <Important /></>} htmlFor={modelFieldId} auto={dvlaState === "found"}>
                      <Input id={modelFieldId} {...form.register("model")} />
                    </Field>
                    <Field label="Variant name" htmlFor={variantNameFieldId}>
                      <Input id={variantNameFieldId} placeholder="e.g. LX 35H" {...form.register("variantName")} />
                    </Field>
                    <Field label="Variant code" htmlFor={variantCodeFieldId}>
                      <Input id={variantCodeFieldId} placeholder="From the BCA invoice, e.g. 1.5 SE" {...form.register("variantCode")} />
                    </Field>
                    <Field
                      label="Year"
                      htmlFor={yearFieldId}
                      auto={dvlaState === "found"}
                      error={errors.year?.message}
                    >
                      <Input id={yearFieldId} type="number" {...form.register("year")} />
                    </Field>
                    <Field label={<>Colour <Important /></>} htmlFor={colourFieldId} auto={dvlaState === "found"}>
                      <Input id={colourFieldId} {...form.register("colour")} />
                    </Field>
                    {/* Sheet col G: CAR / SUV / MPV / VAN — one choice that
                        sets both the type and, for SUV/MPV, the body. */}
                    <Select
                      id={vehicleTypeFieldId}
                      label="Vehicle type"
                      options={VEHICLE_CATEGORY_OPTIONS}
                      value={vehicleCategory({
                        vehicleType: watchAll.vehicleType,
                        bodyType: watchAll.bodyType,
                      })}
                      onChange={(cat) => {
                        const next = vehicleCategoryPatch(cat, {
                          bodyType: form.getValues("bodyType"),
                        });
                        form.setValue("vehicleType", next.vehicleType);
                        form.setValue("bodyType", next.bodyType);
                      }}
                    />
                    <Controller
                      control={form.control}
                      name="bodyType"
                      render={({ field }) => (
                        <Select
                          id={bodyTypeFieldId}
                          label="Body type"
                          options={BODY_TYPES.map((b) => ({ value: b, label: optionLabel(b) }))}
                          value={field.value}
                          onChange={(v) => field.onChange(v)}
                        />
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="fuelType"
                      render={({ field }) => (
                        <Select
                          id={fuelTypeFieldId}
                          label="Fuel type"
                          options={FUEL_TYPES.map((f) => ({ value: f, label: optionLabel(f) }))}
                          value={field.value}
                          onChange={(v) => field.onChange(v)}
                          helpText={dvlaState === "found" ? AUTO_FILLED : undefined}
                        />
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="transmission"
                      render={({ field }) => (
                        <Select
                          id={transmissionFieldId}
                          label="Transmission"
                          options={[...TRANSMISSION_OPTIONS]}
                          value={field.value}
                          onChange={(v) => field.onChange(v)}
                        />
                      )}
                    />
                    <Field label="Engine size (cc)" htmlFor={engineSizeFieldId}>
                      <Input id={engineSizeFieldId} type="number" {...form.register("engineSizeCC")} />
                    </Field>
                    <Field label="MOT expiry" htmlFor={motExpiryFieldId}>
                      <Input id={motExpiryFieldId} type="date" {...form.register("motExpiry")} />
                    </Field>
                    <Field
                      label="Legacy S/N"
                      htmlFor={legacySerialFieldId}
                      error={errors.legacySerialNumber?.message}
                    >
                      <Input
                        id={legacySerialFieldId}
                        type="number"
                        min={1}
                        placeholder="Only for a car from the old Excel sheet"
                        {...form.register("legacySerialNumber")}
                      />
                    </Field>
                  </div>
                </Card>

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
              </>
            )}

            {/* ───────────────────────────── STEP 2 — Buying ── */}
            {step === 1 && (
              <Card title="Buying">
                <p className="text-sm text-(--text-secondary)">
                  Where the car came from and who owns it
                </p>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <Field label={<>Seller name <Important /></>} htmlFor={sellerNameFieldId}>
                    <Input id={sellerNameFieldId} {...form.register("sellerName")} />
                  </Field>
                  <Field label="Seller phone" htmlFor={sellerPhoneFieldId}>
                    <Input id={sellerPhoneFieldId} {...form.register("sellerPhone")} />
                  </Field>
                  <Controller
                    control={form.control}
                    name="purchaseSource"
                    render={({ field }) => (
                      <Select
                        id={sourceTypeFieldId}
                        label="Source type"
                        options={[...SOURCE_OPTIONS]}
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                      />
                    )}
                  />
                  {watchedSource === "dealer" && (
                    <Select
                      id={dealerPartnerFieldId}
                      label="Dealer partner"
                      placeholder="Select dealer partner…"
                      options={
                        partners.length === 0
                          ? [{ value: "__none", label: "No dealer partners", disabled: true }]
                          : partners.map((p) => ({
                              value: p.id,
                              label: `${p.companyName ?? p.name}${p.companyName ? ` (${p.name})` : ""}`,
                            }))
                      }
                      value={selectedPartnerId}
                      onChange={setSelectedPartnerId}
                    />
                  )}
                  <Controller
                    control={form.control}
                    name="localOrImport"
                    render={({ field }) => (
                      <Select
                        id={localOrImportFieldId}
                        label="Local or import"
                        options={[
                          { value: "local", label: "Local" },
                          { value: "import", label: "Import" },
                        ]}
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                      />
                    )}
                  />
                  {/* Free text with suggestions: the sheet holds places
                      (BLACKBUSHE, CAMBERLEY) and terms (SOR, PARTEX) that a
                      fixed list would reject. */}
                  <Field label={<>Auction house <Important /></>} htmlFor={auctionHouseFieldId}>
                    <Input
                      id={auctionHouseFieldId}
                      list={`${baseId}-auction-houses`}
                      placeholder="e.g. BCA AUCTION, SOR, PARTEX"
                      {...form.register("auctionHouse")}
                    />
                    <datalist id={`${baseId}-auction-houses`}>
                      {[...new Set([...AUCTION_HOUSE_SUGGESTIONS, ...AUCTION_HOUSES.map((h) => h.toUpperCase())])].map((h) => (
                        <option key={h} value={h} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label={<>Owned by <Important /></>} htmlFor={ownedByFieldId}>
                    <Input
                      id={ownedByFieldId}
                      list={`${baseId}-owned-by`}
                      placeholder="BCA, CAR CAPITAL, INFINIT…"
                      {...form.register("ownedBy")}
                    />
                    <datalist id={`${baseId}-owned-by`}>
                      {OWNED_BY_SUGGESTIONS.map((o) => (
                        <option key={o} value={o} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Owner details" htmlFor={ownerDetailsFieldId}>
                    <Input
                      id={ownerDetailsFieldId}
                      placeholder="Name of the owner"
                      {...form.register("ownerDetails")}
                    />
                  </Field>
                  <Field label={<>Invoice date <Important /></>} htmlFor={invoiceDateFieldId}>
                    <Input id={invoiceDateFieldId} type="date" {...form.register("invoiceDate")} />
                  </Field>
                  <Field label="Credit note date" htmlFor={creditNoteDateFieldId}>
                    <Input id={creditNoteDateFieldId} type="date" {...form.register("creditNoteDate")} />
                  </Field>
                  <Controller
                    control={form.control}
                    name="financeProvider"
                    render={({ field }) => (
                      <Select
                        id={financeProviderFieldId}
                        label="Stocking finance"
                        options={FINANCE_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                      />
                    )}
                  />
                </div>
              </Card>
            )}

            {/* ───────────────────────────── STEP 3 — Costs ── */}
            {step === 2 && (
              <Card title="Purchase cost breakdown">
                <p className="text-sm text-(--text-secondary)">
                  Enter the VAT actually paid on each line. Leave it blank if
                  none was paid.
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-88 text-sm">
                    <thead>
                      <tr className="border-b border-(--border-secondary) text-left text-xs text-(--text-secondary)">
                        <th className="py-1.5 pr-2 font-medium">Cost item</th>
                        <th className="whitespace-nowrap py-1.5 pr-2 text-right font-medium">Amount £</th>
                        <th className="whitespace-nowrap py-1.5 pr-2 text-right font-medium">VAT paid £</th>
                      </tr>
                    </thead>
                    <tbody>
                      <CostRow label={<>Buying price <Important /></>} name="buyingPrice" vatName="vatOnBuyingPrice" form={form} />
                      <CostRow label="BCA buyer's fee" name="buyersFee" vatName="vatOnBuyersFee" form={form} />
                      <CostRow label="BCA essential check / Assured" name="inspectionCharge" vatName="vatOnInspectionCharge" form={form} />
                      <CostRow label="BCA EV / hybrid Assured" name="evAssuredCharge" vatName="vatOnEvAssuredCharge" form={form} />
                      <CostRow label="Battery health report" name="batteryReportFee" vatName="vatOnBatteryReportFee" form={form} />
                      <CostRow label="Late payment / storage" name="lateStorageFee" vatName="vatOnLateStorageFee" form={form} />
                      <CostRow label="Collection" name="collectionFee" vatName="vatOnCollectionFee" form={form} />
                      <CostRow label="Delivery / transport" name="deliveryFee" vatName="vatOnDeliveryFee" form={form} />
                      <tr className="border-t border-(--border) bg-(--bg-surface-secondary)">
                        <td className="py-2 pl-2 pr-2 font-semibold">Total buying price</td>
                        <td colSpan={2} className="py-2 pr-2 text-right font-semibold tabular-nums">
                          {formatCurrency(totalBuyingPrice)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="pt-4 text-xs text-(--text-secondary)">
                          Not part of the total buying price on the master sheet:
                        </td>
                      </tr>
                      <CostRow label="Other charges" name="otherCharges" form={form} />
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ───────────────────────────── STEP 4 — Receiving ── */}
            {step === 3 && (
              <>
                <Card title="Receiving">
                  <p className="text-sm text-(--text-secondary)">
                    When the car arrived, and what came with it
                  </p>
                  <div className="mt-2 grid gap-4 sm:grid-cols-2">
                    <Field label={<>Vehicle receiving date <Important /></>} htmlFor={receivedDateFieldId}>
                      <Input id={receivedDateFieldId} type="date" {...form.register("receivedDate")} />
                    </Field>
                    <Field label="Received by" htmlFor={receivedByFieldId}>
                      <Controller
                        control={form.control}
                        name="receivedBy"
                        render={({ field }) => (
                          <EmployeeCombobox
                            id={receivedByFieldId}
                            users={users}
                            value={users.find((u) => u.id === field.value) ?? null}
                            onChange={(u) => field.onChange(u?.id ?? "")}
                          />
                        )}
                      />
                    </Field>
                    <Field label={<>Log book <Important /></>} htmlFor={logBookFieldId}>
                      <Input
                        id={logBookFieldId}
                        list={`${baseId}-log-book`}
                        placeholder="AVAILABLE, NOT AVAILABLE…"
                        {...form.register("logBook")}
                      />
                      <datalist id={`${baseId}-log-book`}>
                        {LOG_BOOK_SUGGESTIONS.map((o) => (
                          <option key={o} value={o} />
                        ))}
                      </datalist>
                    </Field>
                    <Field label="Euro status" htmlFor={euroStatusFieldId}>
                      <Input id={euroStatusFieldId} placeholder="e.g. EURO 6" {...form.register("euroStatus")} />
                    </Field>
                    <Field label="Engine size (kW)" htmlFor={engineSizeKwFieldId} error={errors.engineSizeKw?.message}>
                      <Input id={engineSizeKwFieldId} type="number" min={0} {...form.register("engineSizeKw")} />
                    </Field>
                    <Field label="Number of seats" htmlFor={numSeatsFieldId} error={errors.numSeats?.message}>
                      <Input id={numSeatsFieldId} type="number" min={0} {...form.register("numSeats")} />
                    </Field>
                    <Field label="Former keepers" htmlFor={formerKeepersFieldId} error={errors.formerKeepers?.message}>
                      <Input id={formerKeepersFieldId} type="number" min={0} {...form.register("formerKeepers")} />
                    </Field>
                    <Field label={<>No. of keys <Important /></>} htmlFor={numKeysFieldId} error={errors.numKeys?.message}>
                      <Input id={numKeysFieldId} type="number" min={0} {...form.register("numKeys")} />
                    </Field>
                    <Field label="Mass in service (kg)" htmlFor={massFieldId} error={errors.massInService?.message}>
                      <Input id={massFieldId} type="number" min={0} {...form.register("massInService")} />
                    </Field>
                    <Field label="Chassis / frame no." htmlFor={vinFieldId}>
                      <Input id={vinFieldId} className="font-mono uppercase" {...form.register("vin")} />
                    </Field>
                    <Field label="Engine no." htmlFor={engineNumberFieldId}>
                      <Input id={engineNumberFieldId} className="font-mono uppercase" {...form.register("engineNumber")} />
                    </Field>
                    <Controller
                      control={form.control}
                      name="serviceHistory"
                      render={({ field }) => (
                        <Select
                          id={serviceHistoryFieldId}
                          label="Service history"
                          options={[...SERVICE_HISTORY_OPTIONS]}
                          value={field.value}
                          onChange={(v) => field.onChange(v)}
                        />
                      )}
                    />
                    <div className="flex items-center sm:pt-6">
                      <Controller
                        control={form.control}
                        name="lockNut"
                        render={({ field }) => (
                          <Checkbox
                            id={lockNutFieldId}
                            label="Lock nut"
                            checked={field.value}
                            onChange={(checked) => field.onChange(checked)}
                          />
                        )}
                      />
                    </div>
                    <Field label="Other items received" htmlFor={otherItemsFieldId} className="sm:col-span-2">
                      <Input
                        id={otherItemsFieldId}
                        placeholder="SD card, nav disc, charging cables…"
                        {...form.register("otherItemsReceived")}
                      />
                    </Field>
                  </div>
                </Card>

                <Card title="Things to do">
                  <p className="text-sm text-(--text-secondary)">
                    Prep work and its cost. The costs add up to the car&apos;s
                    Total Value Addition.
                  </p>
                  {todos.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {todos.map((t, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-2 rounded-(--radius-200) border border-(--border) py-1 pl-2 pr-1 text-xs"
                        >
                          <span className="flex-1">{t.description}</span>
                          <span className="tabular-nums">{formatCurrency(t.cost)}</span>
                          <Button
                            variant="tertiary"
                            size="micro"
                            icon="DeleteMinor"
                            accessibilityLabel={`Remove ${t.description}`}
                            onClick={() => removeTodo(i)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <TextField
                        id={newTodoDescriptionFieldId}
                        label="Description"
                        placeholder="e.g. Service, MOT, valet"
                        value={newTodo.description}
                        onChange={(v) => setNewTodo((p) => ({ ...p, description: v }))}
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <TextField
                        id={newTodoCostFieldId}
                        label="Cost £"
                        type="number"
                        step={0.01}
                        value={String(newTodo.cost)}
                        onChange={(v) => setNewTodo((p) => ({ ...p, cost: Math.max(0, Number(v) || 0) }))}
                      />
                    </div>
                    <Button icon="PlusMinor" onClick={addTodo}>
                      Add item
                    </Button>
                  </div>
                </Card>

                <Card title="Pricing">
                  <p className="text-sm text-(--text-secondary)">Optional, can set later</p>
                  <div className="mt-2 grid gap-4 sm:grid-cols-3">
                    <Field label="Warranty cost £" htmlFor={warrantyCostFieldId} error={errors.warrantyCost?.message}>
                      <Input id={warrantyCostFieldId} type="number" step="0.01" min={0} {...form.register("warrantyCost")} />
                    </Field>
                    <Field label="Minimum sale price £" htmlFor={minimumSalePriceFieldId} error={errors.minimumSalePrice?.message}>
                      <Input id={minimumSalePriceFieldId} type="number" step="0.01" min={0} {...form.register("minimumSalePrice")} />
                    </Field>
                    <Field label="Listing price £" htmlFor={listingPriceFieldId} error={errors.listingPrice?.message}>
                      <Input id={listingPriceFieldId} type="number" step="0.01" min={0} {...form.register("listingPrice")} />
                    </Field>
                  </div>
                </Card>
              </>
            )}

            {/* ───────────────────────────── STEP 5 — Review ── */}
            {step === 4 && (
              <>
                {missingImportant.length > 0 ? (
                  // Never blocks the save (client, 18 Sep 2026) — it only says
                  // what is still blank so it can be filled in later.
                  <Banner tone="warning">
                    Not filled in yet: {missingImportant.join(", ")}. You can
                    still submit and complete these later on the vehicle page
                    or the Master Sheet.
                  </Banner>
                ) : (
                  <Banner tone="success">
                    Everything important is filled in. The cost summary
                    reflects what will be saved.
                  </Banner>
                )}

                <ReviewCard
                  title="Vehicle"
                  onEdit={() => go(0)}
                  rows={[
                    ["Registration", formatRegPlate(watchAll.registration ?? "") || UNREGISTERED],
                    ["Make / model", `${watchAll.make || "—"} ${watchAll.model || ""}`.trim()],
                    ["Vehicle type", vehicleCategory({ vehicleType: watchAll.vehicleType, bodyType: watchAll.bodyType })],
                    ["Year", watchAll.year || "—"],
                    ["Mileage", watchAll.mileage ? `${Number(watchAll.mileage).toLocaleString()} mi` : "—"],
                    ["Colour", String(watchAll.colour || "—")],
                  ]}
                />
                <ReviewCard
                  title="Buying"
                  onEdit={() => go(1)}
                  rows={[
                    ["Seller", String(watchAll.sellerName || "—")],
                    ["Auction house", String(watchAll.auctionHouse || "—")],
                    ["Owned by", String(watchAll.ownedBy || "—")],
                    ["Owner details", String(watchAll.ownerDetails || "—")],
                    ["Local / import", String(watchAll.localOrImport ?? "—").toUpperCase()],
                    ["Invoice date", watchAll.invoiceDate || "—"],
                  ]}
                />
                <ReviewCard
                  title="Receiving"
                  onEdit={() => go(3)}
                  rows={[
                    ["Received", watchAll.receivedDate || "—"],
                    ["Log book", String(watchAll.logBook || "—")],
                    ["Service history", SERVICE_HISTORY_OPTIONS.find((o) => o.value === watchAll.serviceHistory)?.label ?? "—"],
                    ["Keys", String(watchAll.numKeys || "—")],
                  ]}
                />
                <ReviewCard
                  title="Costs and pricing"
                  onEdit={() => go(2)}
                  rows={[
                    ["Buying price", formatCurrency(buyingPrice)],
                    ["Fees, VAT and charges", formatCurrency(fees)],
                    ["Total buying", formatCurrency(totalBuyingPrice)],
                    ["Value addition (to-dos)", formatCurrency(prepCosts)],
                    ["Base cost", formatCurrency(baseCost)],
                    ["Listing price", formatCurrency(opt(watchAll.listingPrice))],
                  ]}
                />
              </>
            )}
          </Layout.Section>

          <Layout.Section variant="oneThird">
            {/* Step list — jump to any step; fields keep their values. */}
            <Card title="Steps">
              <nav aria-label="Add vehicle steps">
                <ol className="flex flex-col gap-1">
                  {STEPS.map((s, i) => {
                    const on = i === step;
                    const done = i < step;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => go(i)}
                          aria-current={on ? "step" : undefined}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-(--radius-200) px-2 py-1.5 text-left transition-colors",
                            on ? "bg-(--bg-surface-selected)" : "hover:bg-(--bg-surface-hover)",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                              on
                                ? "bg-(--bg-fill-brand) text-(--text-brand-on-bg-fill)"
                                : done
                                  ? "bg-(--bg-surface-success) text-(--text-success)"
                                  : "bg-(--bg-fill-secondary) text-(--text-secondary)",
                            )}
                          >
                            {done ? <Check className="size-3.5" /> : i + 1}
                          </span>
                          <span className="min-w-0">
                            <span className={cn("block text-sm", on ? "font-semibold" : "font-medium")}>
                              {s.title}
                            </span>
                            <span className="block text-xs text-(--text-secondary)">{s.hint}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </Card>

            {/* AutoTrader valuation */}
            {atData.retailValuation != null && (
              <Card title="AutoTrader valuation">
                <p className="text-xs text-(--text-secondary)">
                  Based on {Number(form.getValues("mileage")).toLocaleString()} mi
                </p>
                <dl className="flex flex-col gap-1">
                  <ValuationRow label="Retail" value={atData.retailValuation} highlight />
                  <ValuationRow label="Trade" value={atData.tradeValuation} />
                  <ValuationRow label="Part-ex" value={atData.partExchangeValuation} />
                </dl>
                <Button
                  fullWidth
                  onClick={() => {
                    if (atData.retailValuation != null) {
                      form.setValue("listingPrice", String(atData.retailValuation));
                      toast.success(
                        `Listing price set to ${formatCurrency(atData.retailValuation)}`,
                      );
                    }
                  }}
                >
                  Use as listing price
                </Button>
              </Card>
            )}

            {/* Live cost summary */}
            <CostSummaryReceipt
              buyingPrice={buyingPrice}
              feesAndCharges={fees}
              stockingCharges={0}
              prepCosts={prepCosts}
              warranty={warrantyCost}
              otherCharges={costInputs.otherCharges ?? 0}
              listingPrice={Number(watchAll.listingPrice) || null}
            >
              <p className="text-xs text-(--text-secondary)">
                Updates live as you enter costs. VAT is only what you enter as
                paid on each line; use +20% to fill the standard rate.
              </p>
            </CostSummaryReceipt>
          </Layout.Section>
        </Layout>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 z-10 bg-(--bg)">
          <PageActions
            secondaryActions={[
              { content: "Back", onAction: () => go(step - 1), disabled: step === 0 },
              // No draft storage behind this yet; kept as it was.
              { content: "Save as draft", disabled: submitting },
            ]}
            primaryAction={
              isLast
                ? {
                    content: "Submit vehicle",
                    // Runs the same RHF submit as the <form>'s onSubmit. A
                    // click handler (not type="submit") so the Continue →
                    // Submit swap on the last step can never submit early.
                    onAction: () => void form.handleSubmit(onSubmit)(),
                    loading: submitting,
                  }
                : { content: "Continue", onAction: () => go(step + 1) }
            }
          />
        </div>
      </form>

      {confirmDialog}
    </Page>
  );
}

/**
 * Type-ahead employee search for "Received By" (GEN-81) — the team asked
 * for type-and-select rather than a long static dropdown. Only a selected
 * employee commits a value; typing without picking a result never sets one,
 * so the field can't silently hold free text as if it were a real employee.
 */
function EmployeeCombobox({
  users,
  value,
  onChange,
  id,
}: {
  users: User[];
  value: User | null;
  onChange: (user: User | null) => void;
  id?: string;
}) {
  return (
    <Combobox
      items={users}
      value={value}
      onValueChange={onChange}
      itemToStringLabel={(u: User) => u.name}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder="Search employees…"
        startAddon={<Search />}
        showClear={value !== null}
        className="w-full"
      />
      <ComboboxPopup>
        <ComboboxEmpty>No employee matches.</ComboboxEmpty>
        <ComboboxList>
          {(u: User) => <ComboboxItem key={u.id} value={u}>{u.name}</ComboboxItem>}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

/** Help line under a field that DVLA / AutoTrader filled in. */
const AUTO_FILLED = "Filled from DVLA";

/** Option label for a lower-case enum value ("hatchback" → "Hatchback"). */
function optionLabel(v: string) {
  if (v === "suv" || v === "mpv") return v.toUpperCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * Red asterisk on an important field. A prompt, not a rule: nothing on this
 * form blocks Continue or Submit (client, 18 Sep 2026).
 */
function Important() {
  return (
    <span className="text-(--text-critical)" title="Important — fill in when you can">
      *
    </span>
  );
}

/**
 * Label + registered input + the (typo-only) validation message. Inputs stay
 * the app's RHF-registered `Input` (refs, onBlur-driven validation, datalists,
 * date pickers); the label/help/error spacing mirrors Polaris' Labelled so
 * they line up with the Polaris Selects in the same grid.
 */
function Field({
  label,
  htmlFor,
  auto,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  /** Shows a "Filled from DVLA" help line once the lookup matched. */
  auto?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <InlineError message={error} /> : null}
      {auto ? <p className="text-xs text-(--text-secondary)">{AUTO_FILLED}</p> : null}
    </div>
  );
}

function ReviewCard({
  title,
  onEdit,
  rows,
}: {
  title: string;
  onEdit: () => void;
  rows: [string, string][];
}) {
  return (
    <Card
      title={title}
      actions={
        <Button
          variant="plain"
          onClick={onEdit}
          accessibilityLabel={`Edit ${title.toLowerCase()}`}
        >
          Edit
        </Button>
      }
    >
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-(--text-secondary)">{k}</dt>
            <dd className="truncate text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ValuationRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2 rounded-(--radius-200) px-2 py-1",
        highlight && "bg-(--bg-surface-secondary)",
      )}
    >
      <dt className="text-sm text-(--text-secondary)">{label}</dt>
      <dd
        className={cn(
          "text-sm tabular-nums",
          highlight ? "font-semibold" : "font-medium",
        )}
      >
        {value != null ? formatCurrency(value) : "—"}
      </dd>
    </div>
  );
}

type MoneyField = Exclude<
  {
    [K in keyof FormInput]-?: FormInput[K] extends string | undefined ? K : never;
  }[keyof FormInput],
  undefined
>;

/**
 * One cost line: the amount, and — for the master sheet's S–AH lines — the
 * VAT actually paid on it. VAT is entered, not assumed: roughly half the
 * client's purchases carry none. "+20%" fills the standard rate in one click.
 */
function CostRow({
  label,
  name,
  vatName,
  form,
}: {
  label: React.ReactNode;
  name: MoneyField;
  vatName?: MoneyField;
  form: ReturnType<typeof useForm<FormInput>>;
}) {
  const fieldId = `cost-row-${name}`;
  const vatId = vatName ? `cost-row-${vatName}` : undefined;
  const amount = Number(form.watch(name)) || 0;
  const error = form.formState.errors[name]?.message;
  const vatError = vatName ? form.formState.errors[vatName]?.message : undefined;
  return (
    <tr className="border-b border-(--border-secondary) align-top last:border-b-0">
      <td className="py-1.5 pr-2">
        <Label className="text-xs font-normal" htmlFor={fieldId}>
          {label}
        </Label>
        {error ?? vatError ? <InlineError message={error ?? vatError} /> : null}
      </td>
      <td className="py-1.5 pr-2 text-right">
        <Input
          id={fieldId}
          type="number"
          step="0.01"
          min={0}
          {...form.register(name)}
          className="ml-auto h-8 w-24 text-right tabular-nums"
        />
      </td>
      <td className="py-1.5 text-right">
        {vatName ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              id={vatId}
              type="number"
              step="0.01"
              min={0}
              aria-label={`VAT paid on ${typeof label === "string" ? label : name}`}
              {...form.register(vatName)}
              className="h-8 w-20 text-right tabular-nums"
            />
            <Button
              variant="tertiary"
              size="micro"
              disabled={amount <= 0}
              accessibilityLabel="Fill in 20% VAT"
              onClick={() =>
                form.setValue(
                  vatName,
                  String(Math.round(amount * VAT_RATE * 100) / 100),
                  { shouldDirty: true },
                )
              }
            >
              +20%
            </Button>
          </div>
        ) : (
          <span className="text-xs text-(--text-secondary)">—</span>
        )}
      </td>
    </tr>
  );
}
