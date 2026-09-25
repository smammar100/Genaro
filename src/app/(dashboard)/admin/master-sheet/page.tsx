"use client";

import {
  VehicleSheet,
  type ColDef,
  type FilterField,
} from "@/components/vehicles/vehicle-sheet";
import type { Vehicle } from "@/lib/types";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { RegPlate } from "@/components/shared/reg-plate";
import {
  AUCTION_HOUSE_SUGGESTIONS,
  FUEL_OPTIONS,
  LOCAL_IMPORT_OPTIONS,
  LOG_BOOK_SUGGESTIONS,
  MASTER_SHEET_SECTIONS,
  OWNED_BY_SUGGESTIONS,
  SALE_STATUS_OPTIONS,
  SELLING_AGENT_SUGGESTIONS,
  SERVICE_HISTORY_OPTIONS,
  TRANSMISSION_OPTIONS,
  VEHICLE_CATEGORY_OPTIONS,
  YES_NO_OPTIONS,
  expenseAtPointOfSale,
  isValueAdditionLocked,
  logBookPatch,
  purchaseMonth,
  purchaseYear,
  receivingConfirmation,
  receivingMonth,
  receivingYear,
  sheetProfit,
  soldMonth,
  soldYear,
  vehicleCategory,
  vehicleCategoryPatch,
} from "@/lib/master-sheet";

/**
 * The Master Sheet — Car Capital's own Excel sheet (A–BS), column for column.
 *
 * Headers are the sheet's own, minus its "(1)" / "(2)" entry markers; the
 * order is the sheet's order. Formula columns (`value`) are computed, never
 * stored or edited. Every other column edits in place. The mapping of each
 * column onto the vehicle record, and why, is docs/master-sheet-spec.md —
 * change the two together.
 */

/** Blank-or-number → a whole number, for integer cells. */
const toInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;

/** "true" / "false" from a YES/NO dropdown → a boolean (or blank). */
const toBool = (value: unknown): boolean | null =>
  value === "true" ? true : value === "false" ? false : null;

const COMMON = "common";
const BUY = "buying";
const REC = "receiving";
const VA = "value_addition";
const SALE = "sales";

const money = (
  key: keyof Vehicle,
  label: string,
  section: string,
  width = 120,
): ColDef => ({ key, label, type: "currency", width, section, editable: true });

const COLS: ColDef[] = [
  // ── Common ────────────────────────────────────────────────────────────
  {
    key: "legacySerialNumber",
    label: "LEGACY S/N",
    type: "number",
    width: 90,
    plain: true,
    sticky: true,
    section: COMMON,
    editable: true,
    toPatch: (value) => ({ legacySerialNumber: toInt(value) }),
  },
  { key: "stockId", label: "STOCK ID", type: "stockId", width: 100, sticky: true, section: COMMON },
  {
    key: "registration",
    label: "REG. NUMBER",
    type: "text",
    width: 170,
    sticky: true,
    section: COMMON,
    editable: true,
    render: (v) => (
      <div className="flex items-center gap-2">
        <VehicleImage
          vehicle={v}
          variant="thumb"
          className="size-10 shrink-0 rounded-lg border border-(--border)"
        />
        <RegPlate registration={v.registration} size="sm" />
      </div>
    ),
    toPatch: (value) => ({
      registration: String(value ?? "").trim().toUpperCase() || "UNREGISTERED",
    }),
  },

  // ── Buying (sheet B–AI) ───────────────────────────────────────────────
  { key: "make", label: "MAKE", type: "text", width: 130, section: BUY, editable: true },
  { key: "model", label: "MODEL", type: "text", width: 130, section: BUY, editable: true },
  { key: "variantName", label: "VARIANT NAME", type: "text", width: 160, section: BUY, editable: true },
  { key: "variantCode", label: "VARIANT CODE", type: "text", width: 120, section: BUY, editable: true },
  {
    key: "vehicleType",
    label: "VEHICLE TYPE",
    type: "select",
    width: 110,
    section: BUY,
    editable: true,
    format: (v) => vehicleCategory(v),
    options: VEHICLE_CATEGORY_OPTIONS,
    toPatch: (value, v) => vehicleCategoryPatch(String(value ?? "CAR"), v),
  },
  {
    key: "transmission",
    label: "TRANSMISSION (AUTO/ MANUAL)",
    type: "select",
    width: 130,
    section: BUY,
    editable: true,
    options: TRANSMISSION_OPTIONS,
    // The column is NOT NULL — clearing the dropdown keeps the current value.
    toPatch: (value, v) => ({
      transmission: (value as Vehicle["transmission"]) ?? v.transmission,
    }),
  },
  { key: "colour", label: "COLOR", type: "text", width: 100, section: BUY, editable: true },
  {
    key: "mileage",
    label: "MILEAGE",
    type: "number",
    width: 100,
    section: BUY,
    editable: true,
    toPatch: (value) => ({ mileage: toInt(value) ?? 0 }),
  },
  {
    key: "localOrImport",
    label: "LOCAL/ IMPORT",
    type: "select",
    width: 110,
    section: BUY,
    editable: true,
    options: LOCAL_IMPORT_OPTIONS,
    toPatch: (value, v) => ({
      localOrImport: (value as Vehicle["localOrImport"]) ?? v.localOrImport,
    }),
  },
  {
    key: "auctionHouse",
    label: "AUCTION HOUSE",
    type: "text",
    width: 140,
    section: BUY,
    editable: true,
    suggestions: AUCTION_HOUSE_SUGGESTIONS,
  },
  {
    key: "ownedBy",
    label: "OWNED BY",
    type: "text",
    width: 160,
    section: BUY,
    editable: true,
    suggestions: OWNED_BY_SUGGESTIONS,
  },
  { key: "ownerDetails", label: "OWNER DETAILS", type: "text", width: 150, section: BUY, editable: true },
  { key: "invoiceDate", label: "INVOICE DATE", type: "date", width: 120, section: BUY, editable: true },
  { key: "creditNoteDate", label: "CREDIT NOTE DATE", type: "date", width: 130, section: BUY, editable: true },
  { key: "invoiceDate", label: "PURCHASE MONTH", type: "text", width: 120, section: BUY, value: purchaseMonth },
  { key: "invoiceDate", label: "PURCHASE YEAR", type: "text", width: 110, section: BUY, value: purchaseYear },
  {
    ...money("buyingPrice", "BUYING PRICE", BUY),
    // NOT NULL — a cleared cell is £0, not "unknown".
    toPatch: (value) => ({ buyingPrice: typeof value === "number" ? value : 0 }),
  },
  {
    ...money("vatOnBuyingPrice", "VAT ON BUYING PRICE 20%", BUY, 150),
    toPatch: (value) => ({ vatOnBuyingPrice: typeof value === "number" ? value : 0 }),
  },
  money("buyersFee", "BCA BUYERS FEE - BUSINESS", BUY, 160),
  money("vatOnBuyersFee", "VAT ON BUYERS FEE 20%", BUY, 150),
  money("inspectionCharge", "BCA ESSENTIAL CHECK / BCA ASSURED CHARGE", BUY, 200),
  money("vatOnInspectionCharge", "VAT ON ESSENTAIL CHECK 20%", BUY, 170),
  money("evAssuredCharge", "BCA EV/ HYBRID ASSURED CHARGE", BUY, 180),
  money("vatOnEvAssuredCharge", "VAT ON HYBRID ASSURED CHARGE", BUY, 180),
  money("batteryReportFee", "BATTERY HEALTH REPORT", BUY, 150),
  money("vatOnBatteryReportFee", "VAT ON BATTERY HEALTH REPORT", BUY, 180),
  money("lateStorageFee", "LATE PAYMENT/ STORAGE FEE", BUY, 160),
  money("vatOnLateStorageFee", "VAT ON LATE PAYMENT / STORAGE", BUY, 180),
  money("collectionFee", "COLLECTION", BUY),
  money("vatOnCollectionFee", "VAT ON COLLECTION", BUY, 130),
  money("deliveryFee", "DELIVERY / TRANSPORT", BUY, 140),
  money("vatOnDeliveryFee", "VAT ON DELIVERY 20%", BUY, 140),
  // AI = SUM(S:AH) — stored, re-derived on every cost edit.
  {
    key: "totalBuyingPrice",
    label: "TOTAL BUYING PRICE/ BCA",
    type: "currency",
    width: 160,
    section: BUY,
    value: (v) => v.totalBuyingPrice,
  },

  // ── Receiving (sheet AJ–BA) ───────────────────────────────────────────
  {
    key: "receivedDate",
    label: "VEHICLE RECEIVING DATE",
    type: "date",
    width: 150,
    section: REC,
    editable: true,
    // NOT NULL on the record — clearing it keeps the current date.
    toPatch: (value, v) => ({ receivedDate: (value as string) ?? v.receivedDate }),
  },
  { key: "receivedDate", label: "RECEIVING CONFIRMATION", type: "text", width: 150, section: REC, value: receivingConfirmation },
  { key: "receivedDate", label: "RECEIVING MONTH", type: "text", width: 120, section: REC, value: receivingMonth },
  { key: "receivedDate", label: "RECEIVING YEAR", type: "text", width: 110, section: REC, value: receivingYear },
  {
    key: "logBook",
    label: "LOG BOOK",
    type: "text",
    width: 130,
    section: REC,
    editable: true,
    suggestions: LOG_BOOK_SUGGESTIONS,
    toPatch: (value) => logBookPatch((value as string) ?? null),
  },
  { key: "euroStatus", label: "EURO STATUS", type: "text", width: 110, section: REC, editable: true },
  {
    key: "fuelType",
    label: "FUEL TYPE",
    type: "select",
    width: 110,
    section: REC,
    editable: true,
    options: FUEL_OPTIONS,
    toPatch: (value, v) => ({ fuelType: (value as Vehicle["fuelType"]) ?? v.fuelType }),
  },
  { key: "engineSizeCC", label: "ENGINE SIZE (CC)", type: "number", width: 120, plain: true, section: REC, editable: true, toPatch: (value) => ({ engineSizeCC: toInt(value) }) },
  { key: "engineSizeKw", label: "ENGINE SIZE (KW)", type: "number", width: 120, plain: true, section: REC, editable: true, toPatch: (value) => ({ engineSizeKw: toInt(value) }) },
  { key: "numSeats", label: "NUMBER OF SEATS", type: "number", width: 120, section: REC, editable: true, toPatch: (value) => ({ numSeats: toInt(value) }) },
  { key: "formerKeepers", label: "FORMER KEEPERS", type: "number", width: 120, section: REC, editable: true, toPatch: (value) => ({ formerKeepers: toInt(value) }) },
  { key: "numKeys", label: "NO. OF KEYS", type: "number", width: 100, section: REC, editable: true, toPatch: (value) => ({ numKeys: toInt(value) ?? 0 }) },
  { key: "massInService", label: "MASS IN SERVICE", type: "number", width: 120, section: REC, editable: true, toPatch: (value) => ({ massInService: toInt(value) }) },
  { key: "vin", label: "CHASSIS/ FRAME NO.", type: "text", width: 170, section: REC, editable: true },
  { key: "engineNumber", label: "ENGINE NO.", type: "text", width: 130, section: REC, editable: true },
  {
    key: "serviceHistory",
    label: "SERVICE HISTORY",
    type: "select",
    width: 130,
    section: REC,
    editable: true,
    options: SERVICE_HISTORY_OPTIONS,
    toPatch: (value) => ({
      serviceHistory: (value as Vehicle["serviceHistory"]) ?? "unknown",
    }),
  },
  {
    key: "lockNut",
    label: "LOCK NUT",
    type: "select",
    width: 100,
    section: REC,
    editable: true,
    options: YES_NO_OPTIONS,
    toPatch: (value) => ({ lockNut: toBool(value) ?? false }),
  },
  { key: "otherItemsReceived", label: "OTHER ITEMS RECEIVED", type: "text", width: 170, section: REC, editable: true },

  // ── Value Addition (sheet BB) ─────────────────────────────────────────
  // New cars: the Things to Do roll-up, read-only here. Legacy cars keep the
  // imported figure and stay editable (isValueAdditionLocked).
  {
    ...money("valueAddition", "TOTAL VALUE ADDITION", VA, 160),
    editableFor: isValueAdditionLocked,
    readOnlyHint: "Sum of this car's Things to Do costs. Edit the costs there.",
    toPatch: (value) => ({ valueAddition: typeof value === "number" ? value : 0 }),
  },

  // ── Sales Data (sheet BC–BS) ──────────────────────────────────────────
  {
    key: "saleStatus",
    label: "AVAILABLE / SOLD",
    type: "select",
    width: 150,
    section: SALE,
    editable: true,
    options: SALE_STATUS_OPTIONS,
    toPatch: (value) => ({ saleStatus: (value as Vehicle["saleStatus"]) ?? "available" }),
  },
  { key: "dateSold", label: "DATE SOLD", type: "date", width: 120, section: SALE, editable: true },
  money("sellingPrice", "SELLING PRICE", SALE),
  {
    key: "financeCompanyDeal",
    label: "FINANCE COMPANY DEAL",
    type: "select",
    width: 150,
    section: SALE,
    editable: true,
    options: YES_NO_OPTIONS,
    toPatch: (value) => ({ financeCompanyDeal: toBool(value) }),
  },
  {
    key: "sellingAgent",
    label: "SELLING AGENT / LEAD FROM",
    type: "text",
    width: 180,
    section: SALE,
    editable: true,
    suggestions: SELLING_AGENT_SUGGESTIONS,
  },
  money("financeCompanyCharges", "FINANCE COMPANY CAHRGES / COMMISSION", SALE, 200),
  money("partnerShare", "PARTNER'S SHARE", SALE),
  money("extendedWarrantyCost", "EXTENDED WARRANTY", SALE, 140),
  money("roadTaxCost", "ROAD TAX", SALE, 110),
  money("insuranceCost", "INSURANCE", SALE, 110),
  money("otherJobsCost", "OTHER JOBS", SALE, 110),
  money("customerDeliveryCost", "CHARGES PAID BY CC FOR DELIVERY TO CUSTOMER", SALE, 220),
  { key: "financeCompanyCharges", label: "EXPENSE AT POINT OF SALE", type: "currency", width: 170, section: SALE, value: expenseAtPointOfSale },
  { key: "sellingPrice", label: "S - P", type: "currency", width: 120, section: SALE, value: sheetProfit },
  { key: "dateSold", label: "SOLD IN MONTH OF", type: "text", width: 130, section: SALE, value: soldMonth },
  { key: "dateSold", label: "SOLD IN YEAR OF", type: "text", width: 120, section: SALE, value: soldYear },
  { key: "remarks", label: "REMARKS", type: "text", width: 200, section: SALE, editable: true },
];

const FILTER_FIELDS: FilterField[] = [
  { key: "legacySerialNumber", label: "Legacy S/N", kind: "num" },
  { key: "make", label: "Make", kind: "text" },
  { key: "model", label: "Model", kind: "text" },
  { key: "vehicleCategory", label: "Vehicle type", kind: "text", get: (v) => vehicleCategory(v) },
  { key: "transmission", label: "Transmission", kind: "text", options: TRANSMISSION_OPTIONS },
  { key: "colour", label: "Colour", kind: "text" },
  { key: "mileage", label: "Mileage", kind: "num" },
  { key: "localOrImport", label: "Local / import", kind: "text", options: LOCAL_IMPORT_OPTIONS },
  { key: "auctionHouse", label: "Auction house", kind: "text" },
  { key: "ownedBy", label: "Owned by", kind: "text" },
  { key: "ownerDetails", label: "Owner details", kind: "text" },
  // Month / year filters — the client's "which month did it come in / sell".
  { key: "purchaseMonth", label: "Purchase month", kind: "text", get: purchaseMonth },
  { key: "purchaseYear", label: "Purchase year", kind: "num", get: purchaseYear },
  { key: "receivingMonth", label: "Receiving month", kind: "text", get: receivingMonth },
  { key: "receivingYear", label: "Receiving year", kind: "num", get: receivingYear },
  { key: "fuelType", label: "Fuel type", kind: "text", options: FUEL_OPTIONS },
  { key: "logBook", label: "Log book", kind: "text" },
  { key: "serviceHistory", label: "Service history", kind: "text", options: SERVICE_HISTORY_OPTIONS },
  { key: "saleStatus", label: "Available / sold", kind: "text", options: SALE_STATUS_OPTIONS },
  { key: "soldMonth", label: "Sold month", kind: "text", get: soldMonth },
  { key: "soldYear", label: "Sold year", kind: "num", get: soldYear },
  { key: "sellingAgent", label: "Selling agent / lead from", kind: "text" },
  { key: "totalBuyingPrice", label: "Total buying price", kind: "num" },
  { key: "sellingPrice", label: "Selling price", kind: "num" },
  { key: "sheetProfit", label: "S - P", kind: "num", get: sheetProfit },
];

export default function MasterSheetPage() {
  return (
    <VehicleSheet
      title="Master sheet"
      cols={COLS}
      filterFields={FILTER_FIELDS}
      sections={MASTER_SHEET_SECTIONS}
      csvName="master-sheet"
      summary={(count, selected) =>
        `Car Capital's master sheet, column for column: buying, receiving, value addition and sales. ${
          count ?? "—"
        } row${count === 1 ? "" : "s"}${
          selected > 0 ? ` · ${selected} selected` : ""
        }.`
      }
    />
  );
}
