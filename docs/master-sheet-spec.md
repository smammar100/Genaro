# Master Sheet — column specification

> **Source:** `DATA RAZA 24-08-2026.xlsx`, sheet `MASTER SHEET` (Car Capital's own
> master sheet, 71 columns A–BS, 1,887 data rows from row 5).
> **Owner of the logic:** `src/lib/master-sheet.ts` (columns, sections, derived
> values) and `src/lib/vehicle-costs.ts` (the cost roll-up).
> **Rule:** column names match the Excel headers exactly, minus the `(1)` / `(2)`
> markers. When this doc and the code disagree, fix one of them — they must not drift.

## How the Excel sheet is laid out

| Row | Holds |
|---|---|
| 1 | Entry marker: `1` = entered when the car is bought, `2` = entered when it is received, `4` = entered at sale, `AUTO` = formula |
| 2 | Section: `COMMON`, `BUYING`, `RECEIVING`, `VALUE ADDITION`, `SALES DATA` |
| 3 | Instruction for whoever fills the cell |
| 4 | Header |
| 5+ | One row per purchase. The same registration can appear twice (bought, sold, bought again) — 88 regs do. **Legacy S/N** is the unique key, not the reg. |

## Sections

The grid has a section switcher next to **Add filter**: **All · Buying · Receiving ·
Value Addition · Sales Data**. `LEGACY S/N`, `STOCK ID` and `REG. NUMBER` show in
every section so a row is always identifiable. One grid, no extra tabs (client ask,
18 Sep 2026 meeting).

## Columns

Legend — **Kind**: `in` typed in by a person, `auto` derived by the app (never
stored, never editable), `roll-up` stored but computed from other records.
**Entered in**: where the value is captured first; every `in` column is also
editable inline on the Master Sheet and on the vehicle page.

### Common

| Col | Header | Kind | App field (`Vehicle`) | DB column | Notes |
|---|---|---|---|---|---|
| A | LEGACY S/N | in | `legacySerialNumber` | `legacy_serial_number` | Serial from the old Excel sheet. Filled by the importer; blank for cars added in the app (they get a **Stock ID** instead). Used to find an old physical card. Presence also locks `TOTAL VALUE ADDITION` (see BB). |
| — | STOCK ID | auto | `stockId` | `stock_id` | App serial, `CC-0001…`. Not in the Excel sheet. |

### Buying (entered when the car is bought — Add Vehicle steps 1–3)

| Col | Header | Kind | App field | DB column | Notes |
|---|---|---|---|---|---|
| B | REG. NUMBER | in | `registration` | `registration` | Reg lookup auto-fills make/model/colour/fuel/engine/euro status. Unregistered cars are saved as `UNREGISTERED`. |
| C | MAKE | in | `make` | `make` | |
| D | MODEL | in | `model` | `model` | |
| E | VARIANT NAME | in | `variantName` | `variant_name` | e.g. `LX 35H`. Auto-filled from the AutoTrader derivative when blank. |
| F | VARIANT CODE | in | `variantCode` | `variant_code` | Typed from the BCA invoice (e.g. `1.5 SE`). **Not** the AutoTrader derivative id — that lives in `atDerivativeId`. |
| G | VEHICLE TYPE | in | `vehicleType` + `bodyType` | `vehicle_type`, `body_type` | Shown as `CAR / SUV / MPV / VAN`: van → VAN, body suv → SUV, body mpv → MPV, else CAR. Picking a value writes both fields. |
| H | TRANSMISSION (AUTO/ MANUAL) | in | `transmission` | `transmission` | `automatic` ↔ AUTO, `manual` ↔ MANUAL |
| I | COLOR | in | `colour` | `colour` | |
| J | MILEAGE | in | `mileage` | `mileage` | Whole miles. Legacy notes like `82386 (KM)` keep the number here and the text in `legacyData`. |
| K | LOCAL/ IMPORT | in | `localOrImport` | `local_or_import` | LOCAL / IMPORT |
| L | AUCTION HOUSE | in | `auctionHouse` | `auction_house` | Free text with suggestions (SOR, PARTEX, BLACKBUSHE, BCA AUCTION…). |
| M | OWNED BY | in | `ownedBy` | `owned_by` | Suggestions: BCA, DEALERS/PRIV. SELLERS, CAR CAPITAL, CAR CAPITAL INVESTOR, INFINIT, CLOSE BROTHERS. |
| N | OWNER DETAILS | in | `ownerDetails` | `owner_details` | Name of the owner (BCA, a partner's name, …). Not the same as **Seller**. |
| O | INVOICE DATE | in | `invoiceDate` | `invoice_date` | BCA invoice date, or receiving date for a private seller. |
| P | CREDIT NOTE DATE | in | `creditNoteDate` | `credit_note_date` | When funded through a credit line (BCA, Close Brothers, Infinit). |
| Q | PURCHASE MONTH | auto | — | — | Month name of **O**, blank when O is blank. Excel: `TEXT(O,"mmmm")` |
| R | PURCHASE YEAR | auto | — | — | Year of **O**. |
| S | BUYING PRICE | in | `buyingPrice` | `buying_price` | Hammer price / price agreed with private seller. |
| T | VAT ON BUYING PRICE 20% | in | `vatOnBuyingPrice` | `vat_on_buying_price` | VAT **actually paid** on S. Blank when none. The form offers a one-click "+20%". |
| U | BCA BUYERS FEE - BUSINESS | in | `buyersFee` | `buyers_fee` | |
| V | VAT ON BUYERS FEE 20% | in | `vatOnBuyersFee` | `vat_on_buyers_fee` | |
| W | BCA ESSENTIAL CHECK / BCA ASSURED CHARGE | in | `inspectionCharge` | `inspection_charge` | |
| X | VAT ON ESSENTAIL CHECK 20% | in | `vatOnInspectionCharge` | `vat_on_inspection_charge` | Header spelling kept from the sheet. |
| Y | BCA EV/ HYBRID ASSURED CHARGE | in | `evAssuredCharge` | `ev_assured_charge` | |
| Z | VAT ON HYBRID ASSURED CHARGE | in | `vatOnEvAssuredCharge` | `vat_on_ev_assured_charge` | |
| AA | BATTERY HEALTH REPORT | in | `batteryReportFee` | `battery_report_fee` | |
| AB | VAT ON BATTERY HEALTH REPORT | in | `vatOnBatteryReportFee` | `vat_on_battery_report_fee` | |
| AC | LATE PAYMENT/ STORAGE FEE | in | `lateStorageFee` | `late_storage_fee` | |
| AD | VAT ON LATE PAYMENT / STORAGE | in | `vatOnLateStorageFee` | `vat_on_late_storage_fee` | |
| AE | COLLECTION | in | `collectionFee` | `collection_fee` | |
| AF | VAT ON COLLECTION | in | `vatOnCollectionFee` | `vat_on_collection_fee` | |
| AG | DELIVERY / TRANSPORT | in | `deliveryFee` | `delivery_fee` | |
| AH | VAT ON DELIVERY 20% | in | `vatOnDeliveryFee` | `vat_on_delivery_fee` | |
| AI | TOTAL BUYING PRICE/ BCA | roll-up | `totalBuyingPrice` | `total_buying_price` | **= S + T + U + V + … + AH** (Excel `SUM(S:AH)`). Stored; re-derived on every cost edit by `computeCostTotals`. |

### Receiving (entered when the car arrives — Add Vehicle step 4)

| Col | Header | Kind | App field | DB column | Notes |
|---|---|---|---|---|---|
| AJ | VEHICLE RECEIVING DATE | in | `receivedDate` | `received_date` | Defaults to today on Add Vehicle. |
| AK | RECEIVING CONFIRMATION | auto | — | — | `RECEIVED` when AJ has a date, else blank. (The sheet's note says "column AM"; the formula uses AJ.) |
| AL | RECEIVING MONTH | auto | — | — | Month name of AJ. |
| AM | RECEIVING YEAR | auto | — | — | Year of AJ. |
| AN | LOG BOOK | in | `logBook` | `log_book` | AVAILABLE / NOT AVAILABLE / YET TO APPLY / WITH OWNER, or free text. Setting it keeps `v5Received` in step (AVAILABLE or YES → true). |
| AO | EURO STATUS | in | `euroStatus` | `euro_status` | Auto-filled by the DVLA lookup. |
| AP | FUEL TYPE | in | `fuelType` | `fuel_type` | PETROL / DIESEL / HYBRID / ELECTRIC. Legacy variants (`PETROL HYBRID ELEC`, …) are normalised; the original text stays in `legacyData`. |
| AQ | ENGINE SIZE (CC) | in | `engineSizeCC` | `engine_size_cc` | |
| AR | ENGINE SIZE (KW) | in | `engineSizeKw` | `engine_size_kw` | |
| AS | NUMBER OF SEATS | in | `numSeats` | `num_seats` | |
| AT | FORMER KEEPERS | in | `formerKeepers` | `former_keepers` | |
| AU | NO. OF KEYS | in | `numKeys` | `num_keys` | Legacy notes (`1 (1 WITH SELLER)`) keep the count here, text in `legacyData`. |
| AV | MASS IN SERVICE | in | `massInService` | `mass_in_service` | kg |
| AW | CHASSIS/ FRAME NO. | in | `vin` | `vin` | |
| AX | ENGINE NO. | in | `engineNumber` | `engine_number` | |
| AY | SERVICE HISTORY | in | `serviceHistory` | `service_history` | FULL / PART / NO / UNKNOWN (`full`/`partial`/`none`/`unknown`). Legacy free text stays in `legacyData`. |
| AZ | LOCK NUT | in | `lockNut` | `lock_nut` | YES / NO. Legacy location notes ("YES INSIDE GLOVEBOX") stay in `legacyData`. |
| BA | OTHER ITEMS RECEIVED | in | `otherItemsReceived` | `other_items_received` | SD card, nav disc, cables… |

### Value Addition

| Col | Header | Kind | App field | DB column | Notes |
|---|---|---|---|---|---|
| BB | TOTAL VALUE ADDITION | roll-up | `valueAddition` | `value_addition` | **New cars:** sum of the costs on the car's **Things to Do** items (every item except cancelled ones) — service, MOT, fuel, wash, bodywork… Re-summed whenever an item is added, edited or deleted (`vehicleService.recomputeValueAddition`). **Legacy cars** (Legacy S/N set): keep the imported figure; never re-summed, so an old car is never zeroed. |

### Sales Data (entered at sale)

| Col | Header | Kind | App field | DB column | Notes |
|---|---|---|---|---|---|
| BC | AVAILABLE / SOLD | in | `saleStatus` | `sale_status` | AVAILABLE / SOLD / RETURNED TO OWNER / DUPLICATE ENTRY. New cars start AVAILABLE; a sales deal reaching a *won* stage sets SOLD. This is the sheet's own status — separate from the pipeline status (Received → Listed → Sold). |
| BD | DATE SOLD | in | `dateSold` | `date_sold` | Stamped by a won deal; editable. |
| BE | SELLING PRICE | in | `sellingPrice` | `selling_price` | Stamped by a won deal; editable. |
| BF | FINANCE COMPANY DEAL | in | `financeCompanyDeal` | `finance_company_deal` | YES / NO — a finance-company deal we owe commission on. |
| BG | SELLING AGENT / LEAD FROM | in | `sellingAgent` | `selling_agent` | Free text with suggestions (AUTO TRADER, ZUTO, WALK IN, CAR GURUS…). |
| BH | FINANCE COMPANY CAHRGES / COMMISSION | in | `financeCompanyCharges` | `finance_company_charges` | Header spelling kept from the sheet. |
| BI | PARTNER'S SHARE | in | `partnerShare` | `partner_share` | Paid to a partner on a shared-ownership car. |
| BJ | EXTENDED WARRANTY | in | `extendedWarrantyCost` | `extended_warranty_cost` | Paid for an extended warranty at sale. Not the same as `warrantyCost` (prep-time warranty cost in the cost ledger). |
| BK | ROAD TAX | in | `roadTaxCost` | `road_tax_cost` | If paid by Car Capital. |
| BL | INSURANCE | in | `insuranceCost` | `insurance_cost` | If paid by Car Capital. |
| BM | OTHER JOBS | in | `otherJobsCost` | `other_jobs_cost` | Any other amount paid in lieu of additional jobs. |
| BN | CHARGES PAID BY CC FOR DELIVERY TO CUSTOMER | in | `customerDeliveryCost` | `customer_delivery_cost` | |
| BO | EXPENSE AT POINT OF SALE | auto | — | — | **= BH + BI + BJ + BK + BL + BM + BN** |
| BP | S - P | auto | — | — | **= BE − AI when BC = SOLD, else 0.** Exactly the sheet's formula: it does *not* subtract value addition or point-of-sale expenses. The app's fuller **Est. profit** (All Vehicles, Financials) is unchanged. |
| BQ | SOLD IN MONTH OF | auto | — | — | Month name of BD when BC = SOLD. |
| BR | SOLD IN YEAR OF | auto | — | — | Year of BD when BC = SOLD. |
| BS | REMARKS | in | `remarks` | `remarks` | |

## The rest of the cost chain (app-only, not on the sheet)

```
totalBuyingPrice (AI) = S + T + U + V + W + X + Y + Z + AA + AB + AC + AD + AE + AF + AG + AH
landedCost            = AI + otherCharges + loadingFee + unloadingFee + valueAddition (BB)
baseCost              = landedCost + stockingCharges + warrantyCost
grossEarning          = (sellingPrice ?? listingPrice) − baseCost
```

`otherCharges`, loading/unloading (stocking finance) and `warrantyCost` exist in the
app but not on the sheet, so they sit below AI rather than inside it — AI must equal
the sheet's `SUM(S:AH)` exactly.

## Month/year filters

The filter builder offers **Purchase month/year** (from O), **Receiving month/year**
(from AJ) and **Sold month/year** (from BD, sold rows only), matching the client's
"which month was it received / sold in" filtering.

## Legacy import

`scripts/import-master-sheet.mjs` reads the Excel file directly (cached formula
values are used for S, which sometimes holds `=15662+3338`), maps every column above,
and stores the untouched original row in `vehicles.legacy_data` so nothing the
normaliser drops is lost. Dry-run by default; see the script header.

| Legacy `AVAILABLE / SOLD` | `sale_status` | pipeline `status` |
|---|---|---|
| SOLD | `sold` | `sold` (also `removed_from_website_at` = date sold, so it never reappears on the Work List) |
| RECEIVED | `available` | `received` |
| RETURNED TO OWNER | `returned_to_owner` | `returned` |
| DUPLICATE ENTRY | skipped unless `--include-duplicates` | — |

Legacy rows get the stock ID `L-<legacy s/n>` so they never consume the company's
`CC-` sequence.
