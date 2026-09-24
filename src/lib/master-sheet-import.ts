/**
 * Maps one row of Car Capital's legacy Excel master sheet onto a vehicle row.
 *
 * Pure and dependency-free (type imports only) so both the importer script
 * (scripts/import-master-sheet.mts, run by plain Node) and the unit tests can
 * load it. The mapping follows docs/master-sheet-spec.md column by column;
 * anything the normaliser has to squeeze into a stricter app field (a mileage
 * written "82386 (KM)", a lock nut "YES INSIDE GLOVEBOX") is kept verbatim in
 * `legacyData`, so nothing on the sheet is lost.
 */

import type {
  BodyType,
  FuelType,
  PurchaseSource,
  SaleStatus,
  ServiceHistory,
  Transmission,
  VehicleStatus,
  VehicleType,
} from "./types";

/** A cell as read from the sheet: cached value, already typed. */
export type Cell = string | number | null;
/** One sheet row keyed by column letter ("A"…"BS"). */
export type SheetRow = Record<string, Cell>;

/** Row 4 of the sheet — used to label `legacyData` keys. */
export type SheetHeaders = Record<string, string>;

/** The columns holding dates (Excel serial numbers). */
export const DATE_COLUMNS = ["O", "P", "AJ", "BD"] as const;

const MILES_PER_KM = 0.621371;

/* ------------------------------------------------------------------ *
 * Cell readers
 * ------------------------------------------------------------------ */

/** Trimmed, single-spaced text, or null for a blank / placeholder cell. */
export function text(c: Cell): string | null {
  if (c === null || c === undefined) return null;
  const s = String(c).replace(/\s+/g, " ").trim();
  if (s === "" || s === "-" || s === "\\" || s === "¬") return null;
  return s;
}

/** Upper-cased `text`. */
export function upper(c: Cell): string | null {
  return text(c)?.toUpperCase() ?? null;
}

/** A money / number cell. "-" and blanks are null; text like "1,200" parses. */
export function money(c: Cell): number | null {
  if (typeof c === "number") return Number.isFinite(c) ? c : null;
  const s = text(c);
  if (!s) return null;
  const n = Number(s.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** First whole number in a cell ("1 (1 WITH SELLER)" → 1), or null. */
export function leadingInt(c: Cell): number | null {
  if (typeof c === "number") return Number.isFinite(c) ? Math.round(c) : null;
  const m = /\d[\d,]*/.exec(text(c) ?? "");
  return m ? Number(m[0].replace(/,/g, "")) : null;
}

/** Excel 1900-system serial → `YYYY-MM-DD`; ISO text passes through. */
export function excelDate(c: Cell): string | null {
  if (typeof c === "number" && Number.isFinite(c) && c > 0) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(c) * 86_400_000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  const s = text(c);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

/* ------------------------------------------------------------------ *
 * Column normalisers
 * ------------------------------------------------------------------ */

/**
 * J — miles. Some imports were written in km ("82386 (KM)") or with both
 * ("140,670 (KM) 88,000 (MILES)"): take the miles figure when given, convert
 * a km-only figure, otherwise the first number.
 */
export function mileage(c: Cell): number | null {
  if (typeof c === "number") return Math.round(c);
  const s = upper(c);
  if (!s) return null;
  const miles = /([\d,]+)\s*\(?MILES/.exec(s);
  if (miles) return Number(miles[1].replace(/,/g, ""));
  const n = leadingInt(s);
  if (n === null) return null;
  return /\bKM\b/.test(s) && !/MILES/.test(s) ? Math.round(n * MILES_PER_KM) : n;
}

/** G — CAR / SUV / MPV / VAN → the app's type + body. */
export function vehicleKind(c: Cell): { vehicleType: VehicleType; bodyType: BodyType } {
  switch (upper(c)) {
    case "VAN":
      return { vehicleType: "van", bodyType: "hatchback" };
    case "SUV":
      return { vehicleType: "car", bodyType: "suv" };
    case "MPV":
      return { vehicleType: "car", bodyType: "mpv" };
    default:
      return { vehicleType: "car", bodyType: "hatchback" };
  }
}

/** H — AUTO / MANUAL (blank on two thirds of rows → manual, the app default). */
export function transmission(c: Cell): Transmission {
  return upper(c)?.startsWith("AUTO") ? "automatic" : "manual";
}

/** AP — the sheet's fuel wording onto the four app fuels. */
export function fuelType(c: Cell): FuelType {
  const s = upper(c) ?? "";
  if (s.includes("HYBRID")) return "hybrid";
  if (s.includes("ELEC")) return "electric";
  if (s.includes("DIESEL")) return "diesel";
  return "petrol";
}

/** AY — free-text service history onto full / partial / none / unknown. */
export function serviceHistory(c: Cell): ServiceHistory {
  const s = upper(c);
  if (!s) return "unknown";
  if (/^(NO|NONE|N\/A|NOT AVAILABLE|NEGLIGIBLE)\b/.test(s)) return "none";
  if (s.startsWith("FULL") || s === "YES" || s === "FSH") return "full";
  if (s.startsWith("PART") || s.startsWith("UPTO") || s.startsWith("UP TO")) return "partial";
  return "unknown";
}

/** AZ — any "yes / available / in the glovebox" style note means present. */
export function lockNut(c: Cell): boolean {
  const s = upper(c);
  if (!s) return false;
  if (/^(NO|NOT)\b/.test(s)) return false;
  return /^(YES|AVAILABLE|INSIDE|IN )/.test(s);
}

/** AN — log book text; the V5 flag follows it (as logBookPatch). */
export function logBook(c: Cell): { logBook: string | null; v5Received: boolean } {
  const s = upper(c);
  return { logBook: s, v5Received: s !== null && /^(AVAILABLE|AVAIALBLE|YES)\b/.test(s) };
}

/** BF — YES / NO → boolean, blank stays unknown. */
export function yesNo(c: Cell): boolean | null {
  const s = upper(c);
  if (s === "YES") return true;
  if (s === "NO") return false;
  return null;
}

/** BC — the sheet status → sale status + pipeline status. Null = skip row. */
export function statuses(
  c: Cell,
): { saleStatus: SaleStatus; status: VehicleStatus } | null {
  switch (upper(c)) {
    case "SOLD":
      return { saleStatus: "sold", status: "sold" };
    case "RETURNED TO OWNER":
      return { saleStatus: "returned_to_owner", status: "returned" };
    case "DUPLICATE ENTRY":
      return null;
    default:
      // RECEIVED, AVAILABLE or blank: still in stock.
      return { saleStatus: "available", status: "received" };
  }
}

/**
 * Model year from a current-format UK plate ("LT07 JDK" → 2007, "PK63 XAW" →
 * 2013). The sheet has no year column but the record needs one; older plate
 * formats fall back to the purchase year.
 */
export function yearFromPlate(reg: string | null, fallback: number): number {
  const m = /^[A-Z]{2}(\d{2})\s?[A-Z]{3}$/.exec((reg ?? "").toUpperCase().trim());
  if (!m) return fallback;
  const n = Number(m[1]);
  return n >= 50 ? 2000 + (n - 50) : 2000 + n;
}

function purchaseSource(ownedBy: string | null, auctionHouse: string | null): PurchaseSource {
  if (auctionHouse === "PARTEX") return "trade_in";
  if (ownedBy === "BCA" || (auctionHouse ?? "").includes("AUCTION")) return "auction";
  return "other";
}

function financeProvider(ownedBy: string | null) {
  if (ownedBy === "BCA") return "bca" as const;
  if (ownedBy === "INFINIT") return "infinit" as const;
  if (ownedBy === "CLOSE BROTHERS") return "close_brothers" as const;
  return "none" as const;
}

/* ------------------------------------------------------------------ *
 * The row
 * ------------------------------------------------------------------ */

/** Snake-case vehicle columns the importer writes (totals added by the caller). */
export interface LegacyVehicleRow {
  legacy_serial_number: number;
  stock_id: string;
  registration: string;
  make: string;
  model: string;
  variant_name: string | null;
  variant_code: string | null;
  year: number;
  vehicle_type: VehicleType;
  body_type: BodyType;
  transmission: Transmission;
  colour: string;
  mileage: number;
  local_or_import: "local" | "import";
  auction_house: string | null;
  owned_by: string | null;
  owner_details: string | null;
  seller_name: string;
  seller_phone: string;
  purchase_source: PurchaseSource;
  finance_provider: "bca" | "infinit" | "close_brothers" | "none";
  invoice_date: string | null;
  credit_note_date: string | null;
  buying_price: number;
  vat_on_buying_price: number;
  buyers_fee: number | null;
  vat_on_buyers_fee: number | null;
  inspection_charge: number | null;
  vat_on_inspection_charge: number | null;
  ev_assured_charge: number | null;
  vat_on_ev_assured_charge: number | null;
  battery_report_fee: number | null;
  vat_on_battery_report_fee: number | null;
  late_storage_fee: number | null;
  vat_on_late_storage_fee: number | null;
  collection_fee: number | null;
  vat_on_collection_fee: number | null;
  delivery_fee: number | null;
  vat_on_delivery_fee: number | null;
  received_date: string;
  log_book: string | null;
  v5_received: boolean;
  euro_status: string | null;
  fuel_type: FuelType;
  engine_size_cc: number | null;
  engine_size_kw: number | null;
  num_seats: number | null;
  former_keepers: number | null;
  num_keys: number;
  mass_in_service: number | null;
  vin: string | null;
  engine_number: string | null;
  service_history: ServiceHistory;
  lock_nut: boolean;
  other_items_received: string | null;
  value_addition: number;
  sale_status: SaleStatus;
  status: VehicleStatus;
  date_sold: string | null;
  selling_price: number | null;
  finance_company_deal: boolean | null;
  selling_agent: string | null;
  finance_company_charges: number | null;
  partner_share: number | null;
  extended_warranty_cost: number | null;
  road_tax_cost: number | null;
  insurance_cost: number | null;
  other_jobs_cost: number | null;
  customer_delivery_cost: number | null;
  remarks: string | null;
  days_in_stock: number;
  removed_from_website_at: string | null;
  legacy_data: Record<string, Cell>;
}

export type RowResult =
  | { kind: "row"; row: LegacyVehicleRow; sheetTotalBuyingPrice: number | null }
  | { kind: "skip"; reason: string };

/**
 * Map one sheet row. `today` is injectable so tests are deterministic; it is
 * only used when a row has no receiving or invoice date at all.
 */
export function mapLegacyRow(
  r: SheetRow,
  headers: SheetHeaders,
  opts: { includeDuplicates?: boolean; today?: string } = {},
): RowResult {
  const sn = leadingInt(r.A);
  if (sn === null) return { kind: "skip", reason: "no legacy serial number" };
  if (!text(r.B) && !text(r.C)) return { kind: "skip", reason: "blank row" };

  let st = statuses(r.BC);
  if (!st) {
    if (!opts.includeDuplicates) return { kind: "skip", reason: "duplicate entry" };
    st = { saleStatus: "duplicate_entry", status: "returned" };
  }

  const registration = upper(r.B)?.replace(/\s+/g, " ") ?? "UNREGISTERED";
  const invoiceDate = excelDate(r.O);
  const receivedDate = excelDate(r.AJ) ?? invoiceDate ?? opts.today ?? new Date().toISOString().slice(0, 10);
  const dateSold = excelDate(r.BD);
  const ownedBy = upper(r.M);
  const auctionHouse = upper(r.L);
  const ownerDetails = upper(r.N);
  const purchaseYear = Number((invoiceDate ?? receivedDate).slice(0, 4));

  const daysInStock =
    st.saleStatus === "sold" && dateSold
      ? Math.max(0, Math.round((Date.parse(dateSold) - Date.parse(receivedDate)) / 86_400_000))
      : 0;

  const legacy: Record<string, Cell> = {};
  for (const [col, header] of Object.entries(headers)) {
    const v = r[col];
    if (v !== null && v !== undefined && v !== "") legacy[`${col} ${header}`] = v;
  }

  return {
    kind: "row",
    sheetTotalBuyingPrice: money(r.AI),
    row: {
      legacy_serial_number: sn,
      stock_id: `L-${sn}`,
      registration,
      make: upper(r.C) ?? "",
      model: upper(r.D) ?? "",
      variant_name: upper(r.E),
      variant_code: upper(r.F),
      year: yearFromPlate(registration, purchaseYear),
      ...(() => {
        const k = vehicleKind(r.G);
        return { vehicle_type: k.vehicleType, body_type: k.bodyType };
      })(),
      transmission: transmission(r.H),
      colour: upper(r.I) ?? "",
      mileage: mileage(r.J) ?? 0,
      local_or_import: upper(r.K) === "IMPORT" ? "import" : "local",
      auction_house: auctionHouse,
      owned_by: ownedBy,
      owner_details: ownerDetails,
      seller_name: ownerDetails ?? auctionHouse ?? "",
      seller_phone: "",
      purchase_source: purchaseSource(ownedBy, auctionHouse),
      finance_provider: financeProvider(ownedBy),
      invoice_date: invoiceDate,
      credit_note_date: excelDate(r.P),
      buying_price: money(r.S) ?? 0,
      vat_on_buying_price: money(r.T) ?? 0,
      buyers_fee: money(r.U),
      vat_on_buyers_fee: money(r.V),
      inspection_charge: money(r.W),
      vat_on_inspection_charge: money(r.X),
      ev_assured_charge: money(r.Y),
      vat_on_ev_assured_charge: money(r.Z),
      battery_report_fee: money(r.AA),
      vat_on_battery_report_fee: money(r.AB),
      late_storage_fee: money(r.AC),
      vat_on_late_storage_fee: money(r.AD),
      collection_fee: money(r.AE),
      vat_on_collection_fee: money(r.AF),
      delivery_fee: money(r.AG),
      vat_on_delivery_fee: money(r.AH),
      received_date: receivedDate,
      ...(() => {
        const lb = logBook(r.AN);
        return { log_book: lb.logBook, v5_received: lb.v5Received };
      })(),
      euro_status: upper(r.AO),
      fuel_type: fuelType(r.AP),
      engine_size_cc: leadingInt(r.AQ),
      engine_size_kw: leadingInt(r.AR),
      num_seats: leadingInt(r.AS),
      former_keepers: leadingInt(r.AT),
      num_keys: leadingInt(r.AU) ?? 0,
      mass_in_service: leadingInt(r.AV),
      vin: upper(r.AW),
      engine_number: upper(r.AX),
      service_history: serviceHistory(r.AY),
      lock_nut: lockNut(r.AZ),
      other_items_received: text(r.BA),
      value_addition: money(r.BB) ?? 0,
      sale_status: st.saleStatus,
      status: st.status,
      date_sold: dateSold,
      selling_price: money(r.BE),
      finance_company_deal: yesNo(r.BF),
      selling_agent: upper(r.BG),
      finance_company_charges: money(r.BH),
      partner_share: money(r.BI),
      extended_warranty_cost: money(r.BJ),
      road_tax_cost: money(r.BK),
      insurance_cost: money(r.BL),
      other_jobs_cost: money(r.BM),
      customer_delivery_cost: money(r.BN),
      remarks: text(r.BS),
      days_in_stock: daysInStock,
      // A sold legacy car must never resurface on the Work List.
      removed_from_website_at:
        st.saleStatus === "sold" ? `${dateSold ?? receivedDate}T00:00:00.000Z` : null,
      legacy_data: legacy,
    },
  };
}
