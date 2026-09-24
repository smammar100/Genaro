"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { RegPlate } from "@/components/shared/reg-plate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// v4.1 spec §11.3 — Add Vehicle arrival form. Reorganised into a guided
// 5-step wizard (Variation E) with a left step rail + a live cost-summary
// receipt. The form stays a single <form> with one onSubmit; sections are
// grouped into steps and RHF keeps field values across step changes.

const SOURCE_OPTIONS = [
  { value: "auction", label: "Auction" },
  { value: "private", label: "Private Seller" },
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

const STEPS: { id: string; title: string; icon: LucideIcon; hint: string }[] = [
  { id: "identity", title: "Vehicle Identity", icon: Car, hint: "Reg lookup + specs" },
  { id: "source", title: "Buying", icon: FileText, hint: "Seller, owner, invoice" },
  { id: "costs", title: "Purchase Costs", icon: Receipt, hint: "Price, fees, VAT" },
  { id: "finish", title: "Receiving", icon: Tag, hint: "Arrival, paperwork, to-dos" },
  { id: "review", title: "Review & Submit", icon: ShieldCheck, hint: "Confirm & save" },
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
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      {/* Shopify "Add product" page header: back arrow + title. */}
      <div className="flex items-start gap-2">
        <Link
          href="/vehicles"
          aria-label="Back to vehicles"
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-[#4a4a4a] hover:bg-[#f1f1f1]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
        <h1 className="text-xl font-semibold text-foreground">Add vehicle</h1>
        <p className="text-[13px] text-muted-foreground">
          Guided arrival form. Typing the registration auto-checks your stock
          book and pre-fills make / year / colour / fuel from DVLA.
        </p>
        </div>
      </div>

      {/* The step rail only earns its 220px on a wide screen; below xl the
          compact step indicator replaces it so the form itself — now two
          inputs per cost line — keeps room to breathe. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[220px_1fr_300px]">
        {/* Step rail */}
        <nav className="hidden xl:block">
          <div className="sticky top-4 flex flex-col gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const on = i === step;
              const done = i < step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                    on ? "bg-[#ebebeb] font-medium" : "hover:bg-[#f1f1f1]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      on
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-[#affebf] text-[#014b40]"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("flex items-center gap-1.5 text-sm", on ? "font-semibold" : "font-medium")}>
                      <Icon className="size-3.5" />
                      {s.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">{s.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Center: form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-w-0 flex-col gap-3">
          <div className="rounded-xl border bg-card p-5">
            {/* Mobile step indicator */}
            <div className="mb-4 flex items-center gap-2 text-sm font-medium xl:hidden">
              <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                {step + 1}
              </span>
              {STEPS[step].title}
              <span className="text-muted-foreground">· {step + 1} of {STEPS.length}</span>
            </div>

            {/* Validation summary (surfaced on the review step) */}
            {isLast && Object.keys(errors).length > 0 && (
              <div className="mb-4 rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <div className="font-semibold">Please fix these errors:</div>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {Object.entries(errors).map(([field, err]) => (
                    <li key={field}>
                      <span className="font-mono">{field}</span>:{" "}
                      {(err as { message?: string })?.message ?? "invalid"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ───────────────────────────── STEP 1 — Identity ── */}
            {step === 0 && (
              <div className="flex flex-col gap-5">
                {/* Reg lookup hero */}
                <div className="rounded-xl border bg-[#f7f7f7] p-4 sm:p-5">
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                    <div className="min-w-0">
                      <Label htmlFor={registrationFieldId}>
                        Registration <Important />
                      </Label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="relative w-[200px]">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={registrationFieldId}
                            {...form.register("registration")}
                            onBlur={() => void handleDvlaLookup()}
                            placeholder="GK66 6NX"
                            className="pl-9 font-mono uppercase tracking-wider"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => void handleDvlaLookup()}
                          disabled={dvlaState === "loading"}
                          className="shrink-0 gap-1.5"
                        >
                          {dvlaState === "loading" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Sparkles className="size-4" />
                          )}
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
                  <div className="mt-2 min-h-[1rem]">
                    {dvlaState === "idle" && (
                      <p className="text-xs text-muted-foreground">
                        No registration yet? Leave it blank and the car is saved
                        as {UNREGISTERED}. You can add the reg later.
                      </p>
                    )}
                    {dvlaState === "loading" && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking DVLA and your stock book
                        {loadingStartedAt !== null
                          ? ` (${Math.max(0, Math.round((Date.now() - loadingStartedAt) / 1000))}s)`
                          : ""}
                        …
                      </p>
                    )}
                    {dvlaState === "found" && (
                      <p className="flex items-center gap-1 text-xs text-[#014b40]">
                        <CheckCircle2 className="h-3 w-3" /> Matched: make / model /
                        derivative, tax, MOT &amp; valuation auto-filled from DVLA +
                        AutoTrader.
                      </p>
                    )}
                    {dvlaState === "not_found" && (
                      <p className="flex items-center gap-1 text-xs text-[#4f4700]">
                        <AlertTriangle className="h-3 w-3" /> The number is incorrect;
                        please try again, or fill the form in manually.
                      </p>
                    )}
                    {dvlaState === "duplicate" && duplicate && (
                      <p className="flex flex-wrap items-center gap-1 text-xs text-[#003a5a] dark:text-sky-400">
                        <Info className="h-3 w-3" />
                        <span>
                          This car is already in your stock book as{" "}
                          <Link
                            href={vehicleDetailHref(duplicate.id, pathname)}
                            className="font-semibold underline underline-offset-2"
                          >
                            {duplicate.stockId}
                          </Link>
                          {duplicate.label ? ` (${duplicate.label})` : ""}.
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Identity fields */}
                <div>
                  <StepHeader icon={Car} title="Vehicle Identity" hint="Auto-filled from DVLA + AutoTrader" />
                  <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={mileageFieldId}>
                        Mileage <Important />
                      </Label>
                      <Input id={mileageFieldId} type="number" min={0} {...form.register("mileage")} />
                      <FieldError message={errors.mileage?.message} />
                    </div>
                    <FieldShell label={<>Make <Important /></>} htmlFor={makeFieldId} auto={dvlaState === "found"}>
                      <Input id={makeFieldId} {...form.register("make")} />
                    </FieldShell>
                    <FieldShell label={<>Model <Important /></>} htmlFor={modelFieldId} auto={dvlaState === "found"}>
                      <Input id={modelFieldId} {...form.register("model")} />
                    </FieldShell>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={variantNameFieldId}>Variant Name</Label>
                      <Input id={variantNameFieldId} placeholder="e.g. LX 35H" {...form.register("variantName")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={variantCodeFieldId}>Variant Code</Label>
                      <Input id={variantCodeFieldId} placeholder="From the BCA invoice, e.g. 1.5 SE" {...form.register("variantCode")} />
                    </div>
                    <FieldShell label="Year" htmlFor={yearFieldId} auto={dvlaState === "found"}>
                      <Input id={yearFieldId} type="number" {...form.register("year")} />
                      <FieldError message={errors.year?.message} />
                    </FieldShell>
                    <FieldShell label={<>Colour <Important /></>} htmlFor={colourFieldId} auto={dvlaState === "found"}>
                      <Input id={colourFieldId} {...form.register("colour")} />
                    </FieldShell>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={vehicleTypeFieldId}>
                        Vehicle Type <Important />
                      </Label>
                      {/* Sheet col G: CAR / SUV / MPV / VAN — one choice
                          that sets both the type and, for SUV/MPV, the body. */}
                      <Select
                        value={vehicleCategory({
                          vehicleType: watchAll.vehicleType,
                          bodyType: watchAll.bodyType,
                        })}
                        onValueChange={(cat) => {
                          const next = vehicleCategoryPatch(cat, {
                            bodyType: form.getValues("bodyType"),
                          });
                          form.setValue("vehicleType", next.vehicleType);
                          form.setValue("bodyType", next.bodyType);
                        }}
                      >
                        <SelectTrigger id={vehicleTypeFieldId} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_CATEGORY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={bodyTypeFieldId}>Body Type</Label>
                      <Controller
                        control={form.control}
                        name="bodyType"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={bodyTypeFieldId} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BODY_TYPES.map((b) => (
                                <SelectItem key={b} value={b} className="capitalize">
                                  {b}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <FieldShell label="Fuel Type" htmlFor={fuelTypeFieldId} auto={dvlaState === "found"}>
                      <Controller
                        control={form.control}
                        name="fuelType"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={fuelTypeFieldId} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FUEL_TYPES.map((f) => (
                                <SelectItem key={f} value={f} className="capitalize">
                                  {f}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FieldShell>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={transmissionFieldId}>Transmission</Label>
                      <Controller
                        control={form.control}
                        name="transmission"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={transmissionFieldId} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRANSMISSION_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={engineSizeFieldId}>Engine Size CC</Label>
                      <Input id={engineSizeFieldId} type="number" {...form.register("engineSizeCC")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={motExpiryFieldId}>MOT Expiry</Label>
                      <Input id={motExpiryFieldId} type="date" {...form.register("motExpiry")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={legacySerialFieldId}>Legacy S/N</Label>
                      <Input
                        id={legacySerialFieldId}
                        type="number"
                        min={1}
                        placeholder="Only for a car from the old Excel sheet"
                        {...form.register("legacySerialNumber")}
                      />
                      <FieldError message={errors.legacySerialNumber?.message} />
                    </div>
                  </div>
                </div>

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

                {/* AutoTrader valuation strip */}
                {atData.retailValuation != null && (
                  <Card className="flex flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">AutoTrader valuation</h2>
                      <span className="text-[13px] font-medium text-muted-foreground">
                        Based on {Number(form.getValues("mileage")).toLocaleString()} mi
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <ValuationCell label="Retail" value={atData.retailValuation} highlight />
                      <ValuationCell label="Trade" value={atData.tradeValuation} />
                      <ValuationCell label="Part-ex" value={atData.partExchangeValuation} />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full"
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
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ───────────────────────────── STEP 2 — Buying ── */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div>
                  <StepHeader icon={FileText} title="Buying" hint="Where the car came from and who owns it" />
                  <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={sellerNameFieldId}>
                        Seller Name <Important />
                      </Label>
                      <Input id={sellerNameFieldId} {...form.register("sellerName")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={sellerPhoneFieldId}>Seller Phone</Label>
                      <Input id={sellerPhoneFieldId} {...form.register("sellerPhone")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={sourceTypeFieldId}>Source Type</Label>
                      <Controller
                        control={form.control}
                        name="purchaseSource"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={sourceTypeFieldId} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SOURCE_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    {watchedSource === "dealer" && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={dealerPartnerFieldId}>Dealer Partner</Label>
                        <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                          <SelectTrigger id={dealerPartnerFieldId} className="w-full">
                            <SelectValue placeholder="Select dealer partner…" />
                          </SelectTrigger>
                          <SelectContent>
                            {partners.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                No dealer partners
                              </SelectItem>
                            ) : (
                              partners.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.companyName ?? p.name}
                                  {p.companyName ? ` (${p.name})` : ""}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={localOrImportFieldId}>
                        Local or Import <Important />
                      </Label>
                      <Controller
                        control={form.control}
                        name="localOrImport"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={localOrImportFieldId} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">Local</SelectItem>
                              <SelectItem value="import">Import</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    {/* Free text with suggestions: the sheet holds places
                        (BLACKBUSHE, CAMBERLEY) and terms (SOR, PARTEX) that a
                        fixed list would reject. */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={auctionHouseFieldId}>
                        Auction House <Important />
                      </Label>
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
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={ownedByFieldId}>
                        Owned By <Important />
                      </Label>
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
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={ownerDetailsFieldId}>Owner Details</Label>
                      <Input
                        id={ownerDetailsFieldId}
                        placeholder="Name of the owner"
                        {...form.register("ownerDetails")}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={invoiceDateFieldId}>
                        Invoice Date <Important />
                      </Label>
                      <Input id={invoiceDateFieldId} type="date" {...form.register("invoiceDate")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={creditNoteDateFieldId}>Credit Note Date</Label>
                      <Input id={creditNoteDateFieldId} type="date" {...form.register("creditNoteDate")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={financeProviderFieldId}>Stocking Finance</Label>
                      <Controller
                        control={form.control}
                        name="financeProvider"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={financeProviderFieldId} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FINANCE_PROVIDERS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ───────────────────────────── STEP 3 — Costs ── */}
            {step === 2 && (
              <div>
                <StepHeader
                  icon={Receipt}
                  title="Purchase Cost Breakdown"
                  hint="Enter the VAT actually paid on each line. Leave it blank if none was paid."
                />
                <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[22rem] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-1.5 pr-2 font-medium">Cost Item</th>
                      <th className="whitespace-nowrap py-1.5 pr-2 text-right font-medium">Amount £</th>
                      <th className="whitespace-nowrap py-1.5 pr-2 text-right font-medium">VAT paid £</th>
                    </tr>
                  </thead>
                  <tbody>
                    <CostRow label={<>Buying Price <Important /></>} name="buyingPrice" vatName="vatOnBuyingPrice" form={form} />
                    <CostRow label="BCA Buyer's Fee" name="buyersFee" vatName="vatOnBuyersFee" form={form} />
                    <CostRow label="BCA Essential Check / Assured" name="inspectionCharge" vatName="vatOnInspectionCharge" form={form} />
                    <CostRow label="BCA EV / Hybrid Assured" name="evAssuredCharge" vatName="vatOnEvAssuredCharge" form={form} />
                    <CostRow label="Battery Health Report" name="batteryReportFee" vatName="vatOnBatteryReportFee" form={form} />
                    <CostRow label="Late Payment / Storage" name="lateStorageFee" vatName="vatOnLateStorageFee" form={form} />
                    <CostRow label="Collection" name="collectionFee" vatName="vatOnCollectionFee" form={form} />
                    <CostRow label="Delivery / Transport" name="deliveryFee" vatName="vatOnDeliveryFee" form={form} />
                    <tr className="border-t bg-muted/30">
                      <td className="py-2 pr-2 font-semibold">Total Buying Price</td>
                      <td colSpan={2} className="py-2 pr-2 text-right font-semibold tabular-nums">
                        {formatCurrency(totalBuyingPrice)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="pt-4 text-xs text-muted-foreground">
                        Not part of the total buying price on the master sheet:
                      </td>
                    </tr>
                    <CostRow label="Other Charges" name="otherCharges" form={form} />
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {/* ───────────────────────────── STEP 4 — Receiving ── */}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                <div>
                  <StepHeader icon={Tag} title="Receiving" hint="When the car arrived, and what came with it" />
                  <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={receivedDateFieldId}>
                        Vehicle Receiving Date <Important />
                      </Label>
                      <Input id={receivedDateFieldId} type="date" {...form.register("receivedDate")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={receivedByFieldId}>Received By</Label>
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
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={logBookFieldId}>
                        Log Book <Important />
                      </Label>
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
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={euroStatusFieldId}>Euro Status</Label>
                      <Input id={euroStatusFieldId} placeholder="e.g. EURO 6" {...form.register("euroStatus")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={engineSizeKwFieldId}>Engine Size (kW)</Label>
                      <Input id={engineSizeKwFieldId} type="number" min={0} {...form.register("engineSizeKw")} />
                      <FieldError message={errors.engineSizeKw?.message} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={numSeatsFieldId}>Number of Seats</Label>
                      <Input id={numSeatsFieldId} type="number" min={0} {...form.register("numSeats")} />
                      <FieldError message={errors.numSeats?.message} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={formerKeepersFieldId}>Former Keepers</Label>
                      <Input id={formerKeepersFieldId} type="number" min={0} {...form.register("formerKeepers")} />
                      <FieldError message={errors.formerKeepers?.message} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={numKeysFieldId}>
                        No. of Keys <Important />
                      </Label>
                      <Input id={numKeysFieldId} type="number" min={0} {...form.register("numKeys")} />
                      <FieldError message={errors.numKeys?.message} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={massFieldId}>Mass in Service (kg)</Label>
                      <Input id={massFieldId} type="number" min={0} {...form.register("massInService")} />
                      <FieldError message={errors.massInService?.message} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={vinFieldId}>Chassis / Frame No.</Label>
                      <Input id={vinFieldId} className="font-mono uppercase" {...form.register("vin")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={engineNumberFieldId}>Engine No.</Label>
                      <Input id={engineNumberFieldId} className="font-mono uppercase" {...form.register("engineNumber")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={serviceHistoryFieldId}>
                        Service History <Important />
                      </Label>
                      <Controller
                        control={form.control}
                        name="serviceHistory"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={serviceHistoryFieldId} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SERVICE_HISTORY_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={lockNutFieldId}>Lock Nut</Label>
                      <div className="flex h-9 items-center rounded-md border bg-background px-3">
                        <Controller
                          control={form.control}
                          name="lockNut"
                          render={({ field }) => (
                            <Switch id={lockNutFieldId} checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <Label htmlFor={otherItemsFieldId}>Other Items Received</Label>
                      <Input
                        id={otherItemsFieldId}
                        placeholder="SD card, nav disc, charging cables…"
                        {...form.register("otherItemsReceived")}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <StepHeader
                    icon={Plus}
                    title="Things to Do"
                    hint="Prep work and its cost. The costs add up to the car's Total Value Addition."
                  />
                  {todos.length > 0 && (
                    <div className="mt-4 flex flex-col gap-1">
                      {todos.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 rounded border p-2 text-xs"
                        >
                          <span className="flex-1">{t.description}</span>
                          <span className="tabular-nums">{formatCurrency(t.cost)}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            aria-label={`Remove ${t.description}`}
                            onClick={() => removeTodo(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-end gap-2">
                    <div className="flex flex-1 flex-col gap-2">
                      <Label htmlFor={newTodoDescriptionFieldId}>Description</Label>
                      <Input
                        id={newTodoDescriptionFieldId}
                        placeholder="e.g. Service, MOT, valet"
                        value={newTodo.description}
                        onChange={(e) => setNewTodo((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                    <div className="flex w-24 flex-col gap-2">
                      <Label htmlFor={newTodoCostFieldId}>Cost £</Label>
                      <Input
                        id={newTodoCostFieldId}
                        type="number"
                        step="0.01"
                        min={0}
                        value={newTodo.cost}
                        onChange={(e) => setNewTodo((p) => ({ ...p, cost: Math.max(0, Number(e.target.value) || 0) }))}
                      />
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addTodo}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add Item
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <StepHeader icon={Tag} title="Pricing" hint="Optional, can set later" />
                  <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={warrantyCostFieldId}>Warranty Cost £</Label>
                      <Input id={warrantyCostFieldId} type="number" step="0.01" min={0} {...form.register("warrantyCost")} />
                      <FieldError message={errors.warrantyCost?.message} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={minimumSalePriceFieldId}>Minimum Sale Price £</Label>
                      <Input id={minimumSalePriceFieldId} type="number" step="0.01" min={0} {...form.register("minimumSalePrice")} />
                      <FieldError message={errors.minimumSalePrice?.message} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={listingPriceFieldId}>Listing Price £</Label>
                      <Input id={listingPriceFieldId} type="number" step="0.01" min={0} {...form.register("listingPrice")} />
                      <FieldError message={errors.listingPrice?.message} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ───────────────────────────── STEP 5 — Review ── */}
            {step === 4 && (
              <div className="flex flex-col gap-4">
                <StepHeader icon={ShieldCheck} title="Review & Submit" hint="Check the details, then submit" />
                {missingImportant.length > 0 ? (
                  // Never blocks the save (client, 18 Sep 2026) — it only says
                  // what is still blank so it can be filled in later.
                  <div className="flex items-start gap-3 rounded-lg border border-transparent bg-[#fff1c2] p-3 text-sm text-[#4f4700] dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Not filled in yet: {missingImportant.join(", ")}. You can
                      still submit and complete these later on the vehicle page or
                      the Master Sheet.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-transparent bg-[#affebf] p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                    <CheckCircle2 className="size-4 shrink-0 text-[#014b40]" />
                    Everything important is filled in. The cost receipt on the
                    right reflects what will be saved.
                  </div>
                )}

                <ReviewCard
                  title="Vehicle"
                  onEdit={() => go(0)}
                  rows={[
                    ["Registration", formatRegPlate(watchAll.registration ?? "") || UNREGISTERED],
                    ["Make / Model", `${watchAll.make || "—"} ${watchAll.model || ""}`.trim()],
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
                    ["Local / Import", String(watchAll.localOrImport ?? "—").toUpperCase()],
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
                  title="Costs & Pricing"
                  onEdit={() => go(2)}
                  rows={[
                    ["Buying price", formatCurrency(buyingPrice)],
                    ["Fees, VAT & charges", formatCurrency(fees)],
                    ["Total buying", formatCurrency(totalBuyingPrice)],
                    ["Value addition (to-dos)", formatCurrency(prepCosts)],
                    ["Base cost", formatCurrency(baseCost)],
                    ["Listing price", formatCurrency(opt(watchAll.listingPrice))],
                  ]}
                />
              </div>
            )}
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-xl border bg-card/85 px-4 py-3 backdrop-blur">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => go(step - 1)}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" disabled={submitting}>
                Save as Draft
              </Button>
              {!isLast ? (
                <Button type="button" onClick={() => go(step + 1)} className="gap-1.5">
                  Continue <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting} className="gap-1.5">
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      <Check className="size-4" /> Submit Vehicle
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Live cost-summary receipt */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 flex flex-col gap-3">
            <CostSummaryReceipt
              buyingPrice={buyingPrice}
              feesAndCharges={fees}
              stockingCharges={0}
              prepCosts={prepCosts}
              warranty={warrantyCost}
              otherCharges={costInputs.otherCharges ?? 0}
              listingPrice={Number(watchAll.listingPrice) || null}
            />
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Updates live as you enter costs. VAT is only what you enter as
              paid on each line; use +20% to fill the standard rate.
            </div>
          </div>
        </aside>
      </div>

      {confirmDialog}
    </div>
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

function StepHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#4a4a4a]" />
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/**
 * Red asterisk on an important field. A prompt, not a rule: nothing on this
 * form blocks Continue or Submit (client, 18 Sep 2026).
 */
function Important() {
  return (
    <span className="text-destructive" title="Important — fill in when you can">
      *
    </span>
  );
}

/** Inline message under a field that failed its (typo-only) check. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

/** Field wrapper that shows a small "DVLA" pill above auto-filled fields. */
function FieldShell({
  label,
  htmlFor,
  auto,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  auto?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor}>{label}</Label>
        {auto && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#ebebeb] px-2 py-0.5 text-xs font-medium text-[#303030] dark:bg-muted dark:text-foreground">
            <Sparkles className="size-2.5" /> DVLA
          </span>
        )}
      </div>
      {children}
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
    <div className="rounded-lg border border-[#e3e3e3] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-[13px] text-[#005bd3] hover:underline"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{k}</span>
            <span className="truncate text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValuationCell({
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
        "rounded-md border bg-card px-3 py-2",
        highlight && "bg-[#f7f7f7] ring-1 ring-foreground/20",
      )}
    >
      <div className="text-[13px] font-medium text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">
        {value != null ? formatCurrency(value) : "—"}
      </div>
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
    <tr className="border-b last:border-b-0 align-top">
      <td className="py-1.5 pr-2">
        <Label className="text-xs font-normal" htmlFor={fieldId}>
          {label}
        </Label>
        <FieldError message={error ?? vatError} />
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
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-1.5 text-xs"
              disabled={amount <= 0}
              title="Fill in 20% VAT"
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
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
