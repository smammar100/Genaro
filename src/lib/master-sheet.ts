/**
 * Car Capital's master sheet, as the app understands it.
 *
 * Every formula column of the client's Excel sheet (Q, R, AK–AM, BO–BR) and
 * every value mapping between a sheet cell and a Vehicle field lives here, so
 * the Master Sheet grid, the CSV export, the filters and the importer can't
 * disagree. Column-by-column reasoning: docs/master-sheet-spec.md.
 */

import type {
  BodyType,
  SaleStatus,
  ServiceHistory,
  TodoItem,
  Vehicle,
  VehicleType,
} from "./types";

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

export type MasterSheetSection =
  | "common"
  | "buying"
  | "receiving"
  | "value_addition"
  | "sales";

/** The switcher next to "Add filter". "All" is represented by `null`. */
export const MASTER_SHEET_SECTIONS: { value: MasterSheetSection; label: string }[] = [
  { value: "buying", label: "Buying" },
  { value: "receiving", label: "Receiving" },
  { value: "value_addition", label: "Value Addition" },
  { value: "sales", label: "Sales Data" },
];

/* ------------------------------------------------------------------ *
 * New-record defaults
 * ------------------------------------------------------------------ */

/** Master sheet fields added in migration 0050 — the ones a create must set. */
export type MasterSheetFieldKey =
  | "legacySerialNumber"
  | "ownerDetails"
  | "creditNoteDate"
  | "vatOnBuyersFee"
  | "vatOnInspectionCharge"
  | "evAssuredCharge"
  | "vatOnEvAssuredCharge"
  | "batteryReportFee"
  | "vatOnBatteryReportFee"
  | "vatOnLateStorageFee"
  | "vatOnCollectionFee"
  | "vatOnDeliveryFee"
  | "logBook"
  | "engineSizeKw"
  | "numSeats"
  | "formerKeepers"
  | "massInService"
  | "engineNumber"
  | "otherItemsReceived"
  | "saleStatus"
  | "financeCompanyDeal"
  | "financeCompanyCharges"
  | "partnerShare"
  | "extendedWarrantyCost"
  | "roadTaxCost"
  | "insuranceCost"
  | "otherJobsCost"
  | "customerDeliveryCost"
  | "remarks";

/** A brand-new car: nothing known yet, on the sheet as AVAILABLE. */
export const EMPTY_MASTER_SHEET_FIELDS: Pick<Vehicle, MasterSheetFieldKey> = {
  legacySerialNumber: null,
  ownerDetails: null,
  creditNoteDate: null,
  vatOnBuyersFee: null,
  vatOnInspectionCharge: null,
  evAssuredCharge: null,
  vatOnEvAssuredCharge: null,
  batteryReportFee: null,
  vatOnBatteryReportFee: null,
  vatOnLateStorageFee: null,
  vatOnCollectionFee: null,
  vatOnDeliveryFee: null,
  logBook: null,
  engineSizeKw: null,
  numSeats: null,
  formerKeepers: null,
  massInService: null,
  engineNumber: null,
  otherItemsReceived: null,
  saleStatus: "available",
  financeCompanyDeal: null,
  financeCompanyCharges: null,
  partnerShare: null,
  extendedWarrantyCost: null,
  roadTaxCost: null,
  insuranceCost: null,
  otherJobsCost: null,
  customerDeliveryCost: null,
  remarks: null,
};

/* ------------------------------------------------------------------ *
 * Date columns — Excel TEXT(x,"mmmm") / TEXT(x,"yyyy")
 * ------------------------------------------------------------------ */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** `YYYY-MM-DD…` → parts, or null for a blank / unparseable date. */
function dateParts(iso: string | null | undefined): { y: number; m: number } | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  return m >= 1 && m <= 12 ? { y, m } : null;
}

/** Full month name of a date, as Excel's `TEXT(date,"mmmm")`. Blank when no date. */
export function monthName(iso: string | null | undefined): string | null {
  const p = dateParts(iso);
  return p ? MONTHS[p.m - 1] : null;
}

/** Four-digit year of a date, as Excel's `TEXT(date,"yyyy")`. Blank when no date. */
export function yearOf(iso: string | null | undefined): string | null {
  const p = dateParts(iso);
  return p ? String(p.y) : null;
}

/** Q — month of the invoice date (O). */
export const purchaseMonth = (v: Pick<Vehicle, "invoiceDate">) => monthName(v.invoiceDate);
/** R — year of the invoice date (O). */
export const purchaseYear = (v: Pick<Vehicle, "invoiceDate">) => yearOf(v.invoiceDate);

/** AK — "RECEIVED" once there is a receiving date (AJ). */
export function receivingConfirmation(v: Pick<Vehicle, "receivedDate">): string | null {
  return dateParts(v.receivedDate) ? "RECEIVED" : null;
}
/** AL — month of the receiving date (AJ). */
export const receivingMonth = (v: Pick<Vehicle, "receivedDate">) => monthName(v.receivedDate);
/** AM — year of the receiving date (AJ). */
export const receivingYear = (v: Pick<Vehicle, "receivedDate">) => yearOf(v.receivedDate);

/* ------------------------------------------------------------------ *
 * Sales-data formulas
 * ------------------------------------------------------------------ */

const num = (x: number | null | undefined): number =>
  typeof x === "number" && Number.isFinite(x) ? x : 0;

/** BO — `SUM(BH:BN)`, the expenses at the point of sale. */
export function expenseAtPointOfSale(
  v: Pick<
    Vehicle,
    | "financeCompanyCharges"
    | "partnerShare"
    | "extendedWarrantyCost"
    | "roadTaxCost"
    | "insuranceCost"
    | "otherJobsCost"
    | "customerDeliveryCost"
  >,
): number {
  return (
    num(v.financeCompanyCharges) +
    num(v.partnerShare) +
    num(v.extendedWarrantyCost) +
    num(v.roadTaxCost) +
    num(v.insuranceCost) +
    num(v.otherJobsCost) +
    num(v.customerDeliveryCost)
  );
}

/**
 * BP "S - P" — `IF(BC="SOLD", BE-AI, 0)`: selling price minus total buying
 * price. Deliberately the sheet's formula, NOT the app's fuller profit (which
 * also takes off value addition, stocking and warranty).
 */
export function sheetProfit(
  v: Pick<Vehicle, "saleStatus" | "sellingPrice" | "totalBuyingPrice">,
): number {
  if (v.saleStatus !== "sold") return 0;
  return num(v.sellingPrice) - num(v.totalBuyingPrice);
}

/** BQ — month of the sale date (BD), sold rows only. */
export function soldMonth(v: Pick<Vehicle, "saleStatus" | "dateSold">): string | null {
  return v.saleStatus === "sold" ? monthName(v.dateSold) : null;
}
/** BR — year of the sale date (BD), sold rows only. */
export function soldYear(v: Pick<Vehicle, "saleStatus" | "dateSold">): string | null {
  return v.saleStatus === "sold" ? yearOf(v.dateSold) : null;
}

/* ------------------------------------------------------------------ *
 * Value addition (BB)
 * ------------------------------------------------------------------ */

/**
 * A legacy car keeps the value addition it was imported with: the detail
 * behind that figure lives on paper cards, not in Things to Do, so summing
 * its (empty) to-do list would zero it.
 */
export function isValueAdditionLocked(v: Pick<Vehicle, "legacySerialNumber">): boolean {
  return v.legacySerialNumber !== null && v.legacySerialNumber !== undefined;
}

/** BB for a new car — every Things to Do cost except cancelled items. */
export function valueAdditionFromTodos(
  todos: Pick<TodoItem, "cost" | "status">[],
): number {
  return todos
    .filter((t) => t.status !== "cancelled")
    .reduce((sum, t) => sum + num(t.cost), 0);
}

/* ------------------------------------------------------------------ *
 * Cell ↔ field mappings
 * ------------------------------------------------------------------ */

export type SelectOption = { value: string; label: string };

/** G — the sheet's one-word vehicle type, derived from type + body. */
export type VehicleCategory = "CAR" | "SUV" | "MPV" | "VAN";

export const VEHICLE_CATEGORY_OPTIONS: SelectOption[] = [
  { value: "CAR", label: "CAR" },
  { value: "SUV", label: "SUV" },
  { value: "MPV", label: "MPV" },
  { value: "VAN", label: "VAN" },
];

export function vehicleCategory(
  v: Pick<Vehicle, "vehicleType" | "bodyType">,
): VehicleCategory {
  if (v.vehicleType === "van") return "VAN";
  if (v.bodyType === "suv") return "SUV";
  if (v.bodyType === "mpv") return "MPV";
  return "CAR";
}

/**
 * The fields to write when a user picks a vehicle type on the sheet. CAR keeps
 * a specific body (saloon, estate…) and only moves off SUV/MPV, which would
 * otherwise still read back as SUV/MPV.
 */
export function vehicleCategoryPatch(
  category: string,
  v: Pick<Vehicle, "bodyType">,
): { vehicleType: VehicleType; bodyType: BodyType } {
  switch (category) {
    case "VAN":
      return { vehicleType: "van", bodyType: v.bodyType };
    case "SUV":
      return { vehicleType: "car", bodyType: "suv" };
    case "MPV":
      return { vehicleType: "car", bodyType: "mpv" };
    default:
      return {
        vehicleType: "car",
        bodyType: v.bodyType === "suv" || v.bodyType === "mpv" ? "hatchback" : v.bodyType,
      };
  }
}

export const TRANSMISSION_OPTIONS: SelectOption[] = [
  { value: "automatic", label: "AUTO" },
  { value: "manual", label: "MANUAL" },
];

export const LOCAL_IMPORT_OPTIONS: SelectOption[] = [
  { value: "local", label: "LOCAL" },
  { value: "import", label: "IMPORT" },
];

export const FUEL_OPTIONS: SelectOption[] = [
  { value: "petrol", label: "PETROL" },
  { value: "diesel", label: "DIESEL" },
  { value: "hybrid", label: "HYBRID" },
  { value: "electric", label: "ELECTRIC" },
];

export const SERVICE_HISTORY_OPTIONS: SelectOption[] = [
  { value: "full", label: "FULL" },
  { value: "partial", label: "PART" },
  { value: "none", label: "NO" },
  { value: "unknown", label: "UNKNOWN" },
];

export const YES_NO_OPTIONS: SelectOption[] = [
  { value: "true", label: "YES" },
  { value: "false", label: "NO" },
];

export const SALE_STATUS_OPTIONS: { value: SaleStatus; label: string }[] = [
  { value: "available", label: "AVAILABLE" },
  { value: "sold", label: "SOLD" },
  { value: "returned_to_owner", label: "RETURNED TO OWNER" },
  { value: "duplicate_entry", label: "DUPLICATE ENTRY" },
];

/** Suggestions only — these cells stay free text, as on the sheet. */
export const OWNED_BY_SUGGESTIONS = [
  "BCA",
  "DEALERS/PRIV. SELLERS",
  "CAR CAPITAL",
  "CAR CAPITAL INVESTOR",
  "INFINIT",
  "CLOSE BROTHERS",
];

export const AUCTION_HOUSE_SUGGESTIONS = [
  "BCA AUCTION",
  "SOR",
  "PARTEX",
  "BLACKBUSHE",
  "CAMBERLEY",
  "BEDFORD",
  "ENFIELD",
  "PADDOCK WOOD",
  "PURCHASE",
  "MANHEIM",
];

export const LOG_BOOK_SUGGESTIONS = [
  "AVAILABLE",
  "NOT AVAILABLE",
  "YET TO APPLY",
  "WITH OWNER",
];

export const SELLING_AGENT_SUGGESTIONS = [
  "AUTO TRADER",
  "ZUTO",
  "CAR CAPITAL",
  "WALK IN",
  "CAR GURUS",
  "CAR FINANCE 247",
  "CAR CAPITAL - RETURNING CUSTOMER",
];

/** Label for a stored option value; the value itself when it isn't listed. */
export function optionLabel(
  options: SelectOption[],
  value: unknown,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value);
  return options.find((o) => o.value === s)?.label ?? s.toUpperCase();
}

/**
 * AN — log book text, plus the matching V5 flag so the vehicle page's
 * "V5 Received" never contradicts the sheet.
 */
export function logBookPatch(
  logBook: string | null,
): { logBook: string | null; v5Received: boolean } {
  const text = logBook?.trim() ? logBook.trim().toUpperCase() : null;
  return {
    logBook: text,
    v5Received: text !== null && /^(AVAILABLE|YES)\b/.test(text),
  };
}

/** AY — sheet wording for the stored service history. */
export function serviceHistoryLabel(value: ServiceHistory): string {
  return optionLabel(SERVICE_HISTORY_OPTIONS, value) ?? "UNKNOWN";
}
