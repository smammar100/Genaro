import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

// The Add vehicle form's schema, types and option lists, shared by
// arrival-form.tsx (state, lookups, submit) and the cards it renders.

export const SOURCE_OPTIONS = [
  { value: "auction", label: "Auction" },
  { value: "private", label: "Private seller" },
  { value: "trade_in", label: "Trade-in" },
  { value: "dealer", label: "Dealer" },
  { value: "other", label: "Other" },
] as const;

export const SERVICE_HISTORY_OPTIONS = [
  { value: "full", label: "Full" },
  { value: "partial", label: "Partial" },
  { value: "none", label: "None" },
  { value: "unknown", label: "Unknown" },
] as const;

export const TRANSMISSION_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
] as const;

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
export const schema = z.object({
  // Vehicle identity (sheet B–K)
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

  // Buying (sheet L–P + seller)
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

  // Purchase costs (sheet S–AH): each fee and the VAT paid on it
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

  // Receiving (sheet AJ–BA)
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

export type FormInput = z.input<typeof schema>;

/** The react-hook-form instance every card receives. */
export type ArrivalFormApi = UseFormReturn<FormInput>;

/** Form fields that hold a string (amounts, VAT) — the cost table's rows. */
export type MoneyField = Exclude<
  {
    [K in keyof FormInput]-?: FormInput[K] extends string | undefined ? K : never;
  }[keyof FormInput],
  undefined
>;

/** Registration saved for a car that has none yet (client, 18 Sep 2026). */
export const UNREGISTERED = "UNREGISTERED";

/** DOM ids for every field, derived from one useId() so labels stay linked. */
export function fieldIds(baseId: string) {
  return {
    registration: `${baseId}-registration`,
    mileage: `${baseId}-mileage`,
    make: `${baseId}-make`,
    model: `${baseId}-model`,
    variantName: `${baseId}-variant-name`,
    variantCode: `${baseId}-variant-code`,
    year: `${baseId}-year`,
    colour: `${baseId}-colour`,
    vehicleType: `${baseId}-vehicle-type`,
    bodyType: `${baseId}-body-type`,
    fuelType: `${baseId}-fuel-type`,
    transmission: `${baseId}-transmission`,
    engineSize: `${baseId}-engine-size`,
    motExpiry: `${baseId}-mot-expiry`,
    sellerName: `${baseId}-seller-name`,
    sellerPhone: `${baseId}-seller-phone`,
    sourceType: `${baseId}-source-type`,
    dealerPartner: `${baseId}-dealer-partner`,
    localOrImport: `${baseId}-local-or-import`,
    auctionHouse: `${baseId}-auction-house`,
    auctionHouseList: `${baseId}-auction-houses`,
    ownedBy: `${baseId}-owned-by`,
    ownedByList: `${baseId}-owned-by-list`,
    invoiceDate: `${baseId}-invoice-date`,
    legacySerial: `${baseId}-legacy-serial`,
    ownerDetails: `${baseId}-owner-details`,
    creditNoteDate: `${baseId}-credit-note-date`,
    logBook: `${baseId}-log-book`,
    logBookList: `${baseId}-log-book-list`,
    euroStatus: `${baseId}-euro-status`,
    engineSizeKw: `${baseId}-engine-size-kw`,
    numSeats: `${baseId}-num-seats`,
    formerKeepers: `${baseId}-former-keepers`,
    mass: `${baseId}-mass-in-service`,
    vin: `${baseId}-vin`,
    engineNumber: `${baseId}-engine-number`,
    otherItems: `${baseId}-other-items`,
    serviceHistory: `${baseId}-service-history`,
    numKeys: `${baseId}-num-keys`,
    lockNut: `${baseId}-lock-nut`,
    financeProvider: `${baseId}-finance-provider`,
    receivedDate: `${baseId}-received-date`,
    receivedBy: `${baseId}-received-by`,
    newTodoDescription: `${baseId}-new-todo-description`,
    newTodoCost: `${baseId}-new-todo-cost`,
    warrantyCost: `${baseId}-warranty-cost`,
    minimumSalePrice: `${baseId}-minimum-sale-price`,
    listingPrice: `${baseId}-listing-price`,
  };
}

export type FieldIds = ReturnType<typeof fieldIds>;

/** Id of a cost-table amount input (kept from the original CostRow). */
export const costRowId = (name: MoneyField) => `cost-row-${name}`;
