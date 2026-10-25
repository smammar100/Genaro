"use client";

import {
  VehicleSheet,
  type ColDef,
  type FilterField,
  type SheetSectionContext,
} from "@/components/vehicles/vehicle-sheet";
import { SectionTabs } from "@/components/master-sheet/section-tabs";
import { columnCountsBySection } from "@/lib/master-sheet-metrics";
import type { Vehicle } from "@/lib/types";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { PHOTOS_ENABLED } from "@/lib/phase-one";
import { RegPlate } from "@/components/shared/reg-plate";
import {
  AUCTION_HOUSE_SUGGESTIONS,
  FUEL_OPTIONS,
  LOCAL_IMPORT_OPTIONS,
  LOCATION_OPTIONS,
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
 * Layout: section tabs (badged with their column counts) over the grid;
 * inside the grid's card, one toolbar row, coloured section bands and
 * calculated (ƒ) columns. Chosen from the /prototype variations D (header)
 * and A (table). The summary figures and the totals row came off so more
 * rows fit (2026-10-25).
 *
 * Headers are the sheet's own words in sentence case, minus its "(1)" /
 * "(2)" entry markers and with its two typos fixed (2026-10-25); the order is
 * the sheet's order. Formula columns (`value`) are computed, never
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
    label: "Legacy S/N",
    type: "number",
    width: 90,
    plain: true,
    sticky: true,
    section: COMMON,
    editable: true,
    toPatch: (value) => ({ legacySerialNumber: toInt(value) }),
  },
  { key: "stockId", label: "Stock ID", type: "stockId", width: 100, sticky: true, section: COMMON, gridHidden: true },
  {
    key: "registration",
    label: "Reg. number",
    type: "text",
    width: 200,
    sticky: true,
    section: COMMON,
    editable: true,
    render: (v) => (
      <div className="flex items-center gap-2">
        {PHOTOS_ENABLED ? (
          <VehicleImage
            vehicle={v}
            variant="thumb"
            className="size-10 shrink-0 rounded-lg border border-(--border)"
          />
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          <RegPlate registration={v.registration} size="sm" />
          <span className="body-sm text-(--text-secondary)">{v.stockId}</span>
        </div>
      </div>
    ),
    toPatch: (value) => ({
      registration: String(value ?? "").trim().toUpperCase() || "UNREGISTERED",
    }),
  },
  // App-only: where the car is, SOLD once sold. Read-only — moves go through
  // Locations, which keeps the movement history.
  {
    key: "currentLocation",
    label: "Location",
    type: "location",
    width: 120,
    sticky: true,
    section: COMMON,
    options: LOCATION_OPTIONS,
    mobileHide: true,
  },

  // ── Buying (sheet B–AI) ───────────────────────────────────────────────
  { key: "make", label: "Make", type: "text", width: 130, section: BUY, editable: true },
  { key: "model", label: "Model", type: "text", width: 130, section: BUY, editable: true },
  { key: "variantName", label: "Variant name", type: "text", width: 160, section: BUY, editable: true },
  { key: "variantCode", label: "Variant code", type: "text", width: 120, section: BUY, editable: true },
  {
    key: "vehicleType",
    label: "Vehicle type",
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
    label: "Transmission (auto / manual)",
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
  { key: "colour", label: "Colour", type: "text", width: 100, section: BUY, editable: true },
  {
    key: "mileage",
    label: "Mileage",
    type: "number",
    width: 100,
    section: BUY,
    editable: true,
    toPatch: (value) => ({ mileage: toInt(value) ?? 0 }),
  },
  {
    key: "localOrImport",
    label: "Local / import",
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
    label: "Auction house",
    type: "text",
    width: 140,
    section: BUY,
    editable: true,
    suggestions: AUCTION_HOUSE_SUGGESTIONS,
  },
  {
    key: "ownedBy",
    label: "Owned by",
    type: "text",
    width: 160,
    section: BUY,
    editable: true,
    suggestions: OWNED_BY_SUGGESTIONS,
  },
  { key: "ownerDetails", label: "Owner details", type: "text", width: 150, section: BUY, editable: true },
  { key: "invoiceDate", label: "Invoice date", type: "date", width: 120, section: BUY, editable: true },
  { key: "creditNoteDate", label: "Credit note date", type: "date", width: 130, section: BUY, editable: true },
  { key: "invoiceDate", label: "Purchase month", type: "text", width: 120, section: BUY, value: purchaseMonth },
  { key: "invoiceDate", label: "Purchase year", type: "text", width: 110, section: BUY, value: purchaseYear },
  {
    ...money("buyingPrice", "Buying price", BUY),
    sum: true,
    // NOT NULL — a cleared cell is £0, not "unknown".
    toPatch: (value) => ({ buyingPrice: typeof value === "number" ? value : 0 }),
  },
  {
    ...money("vatOnBuyingPrice", "VAT on buying price 20%", BUY, 150),
    toPatch: (value) => ({ vatOnBuyingPrice: typeof value === "number" ? value : 0 }),
  },
  money("buyersFee", "BCA buyers fee - business", BUY, 160),
  money("vatOnBuyersFee", "VAT on buyers fee 20%", BUY, 150),
  money("inspectionCharge", "BCA essential check / BCA assured charge", BUY, 200),
  money("vatOnInspectionCharge", "VAT on essential check 20%", BUY, 170),
  money("evAssuredCharge", "BCA EV / hybrid assured charge", BUY, 180),
  money("vatOnEvAssuredCharge", "VAT on hybrid assured charge", BUY, 180),
  money("batteryReportFee", "Battery health report", BUY, 150),
  money("vatOnBatteryReportFee", "VAT on battery health report", BUY, 180),
  money("lateStorageFee", "Late payment / storage fee", BUY, 160),
  money("vatOnLateStorageFee", "VAT on late payment / storage", BUY, 180),
  money("collectionFee", "Collection", BUY),
  money("vatOnCollectionFee", "VAT on collection", BUY, 130),
  money("deliveryFee", "Delivery / transport", BUY, 140),
  money("vatOnDeliveryFee", "VAT on delivery 20%", BUY, 140),
  // AI = SUM(S:AH) — stored, re-derived on every cost edit.
  {
    key: "totalBuyingPrice",
    label: "Total buying price / BCA",
    type: "currency",
    width: 160,
    section: BUY,
    value: (v) => v.totalBuyingPrice,
    sum: true,
  },

  // ── Receiving (sheet AJ–BA) ───────────────────────────────────────────
  {
    key: "receivedDate",
    label: "Vehicle receiving date",
    type: "date",
    width: 150,
    section: REC,
    editable: true,
    // NOT NULL on the record — clearing it keeps the current date.
    toPatch: (value, v) => ({ receivedDate: (value as string) ?? v.receivedDate }),
  },
  { key: "receivedDate", label: "Receiving confirmation", type: "text", width: 150, section: REC, value: receivingConfirmation },
  { key: "receivedDate", label: "Receiving month", type: "text", width: 120, section: REC, value: receivingMonth },
  { key: "receivedDate", label: "Receiving year", type: "text", width: 110, section: REC, value: receivingYear },
  {
    key: "logBook",
    label: "Log book",
    type: "text",
    width: 130,
    section: REC,
    editable: true,
    suggestions: LOG_BOOK_SUGGESTIONS,
    toPatch: (value) => logBookPatch((value as string) ?? null),
  },
  { key: "euroStatus", label: "Euro status", type: "text", width: 110, section: REC, editable: true },
  {
    key: "fuelType",
    label: "Fuel type",
    type: "select",
    width: 110,
    section: REC,
    editable: true,
    options: FUEL_OPTIONS,
    toPatch: (value, v) => ({ fuelType: (value as Vehicle["fuelType"]) ?? v.fuelType }),
  },
  { key: "engineSizeCC", label: "Engine size (cc)", type: "number", width: 120, plain: true, section: REC, editable: true, toPatch: (value) => ({ engineSizeCC: toInt(value) }) },
  { key: "engineSizeKw", label: "Engine size (kW)", type: "number", width: 120, plain: true, section: REC, editable: true, toPatch: (value) => ({ engineSizeKw: toInt(value) }) },
  { key: "numSeats", label: "Number of seats", type: "number", width: 120, section: REC, editable: true, toPatch: (value) => ({ numSeats: toInt(value) }) },
  { key: "formerKeepers", label: "Former keepers", type: "number", width: 120, section: REC, editable: true, toPatch: (value) => ({ formerKeepers: toInt(value) }) },
  { key: "numKeys", label: "No. of keys", type: "number", width: 100, section: REC, editable: true, toPatch: (value) => ({ numKeys: toInt(value) ?? 0 }) },
  { key: "massInService", label: "Mass in service", type: "number", width: 120, section: REC, editable: true, toPatch: (value) => ({ massInService: toInt(value) }) },
  { key: "vin", label: "Chassis / frame no.", type: "text", width: 170, section: REC, editable: true },
  { key: "engineNumber", label: "Engine no.", type: "text", width: 130, section: REC, editable: true },
  {
    key: "serviceHistory",
    label: "Service history",
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
    label: "Lock nut",
    type: "select",
    width: 100,
    section: REC,
    editable: true,
    options: YES_NO_OPTIONS,
    toPatch: (value) => ({ lockNut: toBool(value) ?? false }),
  },
  { key: "otherItemsReceived", label: "Other items received", type: "text", width: 170, section: REC, editable: true },

  // ── Value Addition (sheet BB) ─────────────────────────────────────────
  // New cars: the Things to Do roll-up, read-only here. Legacy cars keep the
  // imported figure and stay editable (isValueAdditionLocked).
  {
    ...money("valueAddition", "Total value addition", VA, 160),
    sum: true,
    editableFor: isValueAdditionLocked,
    readOnlyHint: "Sum of this car's Things to Do costs. Edit the costs there.",
    toPatch: (value) => ({ valueAddition: typeof value === "number" ? value : 0 }),
  },

  // ── Sales Data (sheet BC–BS) ──────────────────────────────────────────
  {
    key: "saleStatus",
    label: "Available / sold",
    type: "select",
    width: 150,
    section: SALE,
    editable: true,
    options: SALE_STATUS_OPTIONS,
    toPatch: (value) => ({ saleStatus: (value as Vehicle["saleStatus"]) ?? "available" }),
  },
  { key: "dateSold", label: "Date sold", type: "date", width: 120, section: SALE, editable: true },
  { ...money("sellingPrice", "Selling price", SALE), sum: true },
  {
    key: "financeCompanyDeal",
    label: "Finance company deal",
    type: "select",
    width: 150,
    section: SALE,
    editable: true,
    options: YES_NO_OPTIONS,
    toPatch: (value) => ({ financeCompanyDeal: toBool(value) }),
  },
  {
    key: "sellingAgent",
    label: "Selling agent / lead from",
    type: "text",
    width: 180,
    section: SALE,
    editable: true,
    suggestions: SELLING_AGENT_SUGGESTIONS,
  },
  money("financeCompanyCharges", "Finance company charges / commission", SALE, 200),
  money("partnerShare", "Partner's share", SALE),
  money("extendedWarrantyCost", "Extended warranty", SALE, 140),
  money("roadTaxCost", "Road tax", SALE, 110),
  money("insuranceCost", "Insurance", SALE, 110),
  money("otherJobsCost", "Other jobs", SALE, 110),
  money("customerDeliveryCost", "Charges paid by CC for delivery to customer", SALE, 220),
  { key: "financeCompanyCharges", label: "Expense at point of sale", type: "currency", width: 170, section: SALE, value: expenseAtPointOfSale, sum: true },
  { key: "sellingPrice", label: "S - P", type: "currency", width: 120, section: SALE, value: sheetProfit, sum: true },
  { key: "dateSold", label: "Sold in month of", type: "text", width: 130, section: SALE, value: soldMonth },
  { key: "dateSold", label: "Sold in year of", type: "text", width: 120, section: SALE, value: soldYear },
  { key: "remarks", label: "Remarks", type: "text", width: 200, section: SALE, editable: true },
];

const FILTER_FIELDS: FilterField[] = [
  { key: "legacySerialNumber", label: "Legacy S/N", kind: "num" },
  { key: "currentLocation", label: "Location", kind: "text", options: LOCATION_OPTIONS },
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

/** Columns per section, for the tab badges. */
const COLUMN_COUNTS = columnCountsBySection(COLS.filter((c) => !c.gridHidden));

/** The section tabs over the grid. */
function MasterSheetSectionHeader({ section, onSectionChange }: SheetSectionContext) {
  return (
    <SectionTabs
      sections={MASTER_SHEET_SECTIONS}
      counts={COLUMN_COUNTS}
      value={section}
      onChange={onSectionChange}
    />
  );
}

export default function MasterSheetPage() {
  return (
    <VehicleSheet
      title="Master sheet"
      cols={COLS}
      filterFields={FILTER_FIELDS}
      sections={MASTER_SHEET_SECTIONS}
      csvName="master-sheet"
      layout="workbook"
      sectionHeader={MasterSheetSectionHeader}
      summary={(_count, selected) =>
        `Every car from purchase to sale. Edit cells in place; ƒ columns calculate themselves.${
          selected > 0 ? ` ${selected} selected.` : ""
        }`
      }
    />
  );
}
