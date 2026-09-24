# UAT — Master Sheet restructure (client sheet A–BS)

Scope: the Master Sheet rebuilt column-for-column on Car Capital's own Excel
sheet (`DATA RAZA 24-08-2026.xlsx`), the Add Vehicle questionnaire, the value
addition roll-up, the cost formulas, and the legacy importer. Spec and column
mapping: `docs/master-sheet-spec.md`. Migration: `db/migrations/0050`.

Sign in as **Abbas Bhai** (super user) unless a case says otherwise. "Row 5"
means row 5 of the client's Excel file (LT07 JDK).

Status key: ✅ pass · ❌ fail · ☐ not run. Cases marked **(auto)** are also
covered by unit tests (`pnpm test`).

## A. Grid layout

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| A1 | Headers match the sheet | Admin → Master Sheet, section **All** | Headers read exactly as the Excel row 4, without "(1)"/"(2)", in sheet order: LEGACY S/N, STOCK ID, REG. NUMBER, MAKE … REMARKS. Long headers wrap to two lines rather than clipping. | ✅ |
| A2 | Section band | Section **All** | A coloured band above the headers labels COMMON / BUYING / RECEIVING / VALUE ADDITION / SALES DATA over their columns; the label stays visible while scrolling a wide section. | ✅ |
| A3 | Section switcher | Click **Buying**, **Receiving**, **Value Addition**, **Sales Data**, **All** | Only that section's columns show (plus LEGACY S/N, STOCK ID, REG. NUMBER); "Columns (n/72)" updates; the grid starts at the first column. | ✅ |
| A4 | Section is remembered | Pick **Sales Data**, reload | Opens on Sales Data. | ✅ |
| A5 | Pinned identifiers | Scroll right in any section | LEGACY S/N, STOCK ID and REG. NUMBER stay pinned side by side. | ✅ |
| A6 | No extra tabs | — | One grid; the switcher sits next to **Add filter** (client ask). | ✅ |

## B. Formula columns (never editable)

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| B1 | PURCHASE MONTH / YEAR | Set INVOICE DATE to 26 Mar 2022 | Q = "March", R = "2022". Blank invoice date → both blank. **(auto)** | ✅ |
| B2 | RECEIVING CONFIRMATION / MONTH / YEAR | Set VEHICLE RECEIVING DATE to 5 Apr 2022 | "RECEIVED", "April", "2022". **(auto)** | ✅ |
| B3 | TOTAL BUYING PRICE = SUM(S:AH) | Enter BUYING PRICE 850, BUYERS FEE 221, DELIVERY 74.54 | TOTAL BUYING PRICE/ BCA = £1,145.54 (matches row 5). **(auto)** | ✅ |
| B4 | VAT counts in the total | Add VAT ON DELIVERY 31.25 | Total rises by exactly £31.25. | ✅ |
| B5 | EXPENSE AT POINT OF SALE | Fill BH–BN with 100/200/300/20/0/5/50 | BO = £675. **(auto)** | ✅ |
| B6 | S - P on a sold row | AVAILABLE / SOLD = SOLD, SELLING PRICE 1190, total buying 1145.54 | S - P = £44.46 (row 5). **(auto)** | ✅ |
| B7 | S - P on an unsold row | AVAILABLE / SOLD = AVAILABLE | S - P = £0.00. **(auto)** | ✅ |
| B8 | SOLD IN MONTH / YEAR | SOLD with DATE SOLD 27 Jul 2022 | "July", "2022"; blank for any status other than SOLD. **(auto)** | ✅ |
| B9 | Formula cells are read-only | Click any formula cell | Nothing opens; no edit affordance. | ✅ |

## C. Editing in the grid

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| C1 | Text edit | Sales Data → click REMARKS, type, Enter | Toast "<reg>: REMARKS updated"; value saved; Activity shows before → after. | ✅ |
| C2 | Cost edit re-derives totals | Buying → set VAT ON DELIVERY 20% | TOTAL BUYING PRICE updates immediately; vehicle page Financials shows the same total. | ✅ |
| C3 | Cost edit permission | Sign in as a role without "Edit costs" (e.g. Inspector) and edit BUYING PRICE | "You don't have permission to edit costs"; nothing saved. | ☐ |
| C4 | Dropdown columns | Edit TRANSMISSION, LOCAL/ IMPORT, FUEL TYPE, SERVICE HISTORY, LOCK NUT, FINANCE COMPANY DEAL, AVAILABLE / SOLD | A dropdown with the sheet's words (AUTO/MANUAL, YES/NO…); picking saves at once. | ☐ |
| C5 | VEHICLE TYPE writes type + body | Set VEHICLE TYPE to SUV, then VAN, then CAR | Vehicle page Type/Body follow (SUV → Car/Suv, VAN → Van); switching back to CAR from SUV sets Hatchback. **(auto)** | ☐ |
| C6 | LOG BOOK keeps V5 in step | Set LOG BOOK to AVAILABLE, then NOT AVAILABLE | Vehicle page "V5 Received" becomes Yes, then No. **(auto)** | ☐ |
| C7 | Suggestions | Edit AUCTION HOUSE / OWNED BY / SELLING AGENT | Type-ahead suggests the sheet's values (SOR, PARTEX, BCA…); any other text is accepted. | ☐ |
| C8 | Escape cancels | Start an edit, press Esc | Original value kept, nothing saved. | ☐ |

## D. Value addition roll-up (BB)

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| D1 | Adding a costed to-do | Vehicle → Things to Do → add "MOT" £80 | Master Sheet TOTAL VALUE ADDITION rises by £80; base cost rises by £80; TOTAL BUYING PRICE unchanged. **(auto)** | ☐ |
| D2 | Editing a to-do cost | Change it to £100 | Value addition rises by a further £20. **(auto)** | ☐ |
| D3 | Cancelling a to-do | Set its status to Cancelled | Its cost drops out of value addition. **(auto)** | ☐ |
| D4 | Deleting a to-do | Delete it | Its cost drops out. **(auto)** | ☐ |
| D5 | Read-only on app cars | Click TOTAL VALUE ADDITION on a car with no LEGACY S/N | Not editable; tooltip says to edit the Things to Do costs. Financials shows it read-only with the same hint. | ✅ |
| D6 | Legacy cars keep their figure | On a car with a LEGACY S/N, add a costed to-do | Value addition does **not** change; the cell stays editable. **(auto)** | ☐ |
| D7 | Existing data after migration | After 0050 | L400 JCM value addition = £350 (its to-do costs), base cost £10,350. | ✅ |

## E. Add Vehicle questionnaire

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| E1 | Nothing mandatory | Inventory → Add Vehicle, press Continue through every step with nothing filled | Every step is reachable; Submit is enabled. | ✅ |
| E2 | Important fields flagged | — | Red asterisk on Registration, Mileage, Make, Model, Colour, Vehicle Type, Seller, Local/Import, Auction House, Owned By, Invoice Date, Buying Price, Receiving Date, Log Book, Keys, Service History. | ✅ |
| E3 | Review lists blanks | Reach Review with fields empty | Amber note lists what is still blank and says it can be completed later; no block. | ✅ |
| E4 | Unregistered car | Leave Registration blank and submit | Saved as UNREGISTERED; no duplicate-reg prompt. | ☐ |
| E5 | Sheet-order steps | — | Steps: Vehicle Identity → Buying → Purchase Costs → Receiving → Review, each holding the sheet section's fields. | ✅ |
| E6 | VAT is entered, not assumed | Purchase Costs: Buying Price 850 | VAT column stays blank; receipt shows £850. | ✅ |
| E7 | +20% button | Click +20% on the buying price | VAT = £170.00; receipt: fees £170, total buying £1,020. | ✅ |
| E8 | Other charges below the total | Enter Other Charges £50 | Total Buying Price unchanged; receipt shows "+ Other Charges £50" and base cost +£50. | ☐ |
| E9 | Variant code not auto-filled | Fetch DVLA for a known reg | Variant Name fills from AutoTrader; Variant Code stays blank (typed from the BCA invoice). | ☐ |
| E10 | Euro status pre-filled | Fetch DVLA for a reg with a Euro status | Receiving step's Euro Status is pre-filled. | ☐ |
| E11 | Typo checks still apply | Year 20019; Mileage -5 | Inline error under the field ("Check the year" / "Enter a whole number"). | ☐ |
| E12 | Saved values | Submit a fully filled form | Every field appears in the matching Master Sheet column and on the vehicle Details tab; AVAILABLE / SOLD = AVAILABLE. | ☐ |
| E13 | Layout at laptop width | Window ~1200px wide | Form, cost table and receipt fit; step rail collapses to "3 · Purchase Costs · 3 of 5". | ✅ |

## F. Vehicle page

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| F1 | Financials ledger | Vehicle → Financials | Lines follow the sheet (Buying Price, VAT on Buying Price, BCA Buyer's Fee, VAT…), then Other/Loading/Unloading/Stocking/Value Addition/Warranty; Total expenses = base cost. | ✅ |
| F2 | Point-of-sale card | Financials → Expenses at point of sale → Edit | BH–BN editable; total = the Master Sheet's EXPENSE AT POINT OF SALE. | ✅ |
| F3 | Details master-sheet cards | Vehicle → Details | "Buying / Receiving / Sales data (master sheet)" cards show and edit every new field. | ✅ |
| F4 | Won deal marks the sheet SOLD | Move a deal to Completed | AVAILABLE / SOLD = SOLD, DATE SOLD and SELLING PRICE stamped, S - P filled; gross earning re-derived. | ☐ |

## G. Filters and export

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| G1 | Month filters | Add filter → Receiving month **is** August | Only cars received in August. Same for Purchase month / Sold month. | ✅ |
| G2 | Year filters | Add filter → Sold year **=** 2022 | Only cars sold in 2022. | ✅ |
| G3 | Sheet wording in filters | Transmission **is** AUTO; Available / sold **is** SOLD | Match on the sheet's words, not the stored values. | ✅ |
| G4 | CSV export | Export CSV | All 72 columns, headers as on screen, dropdown columns exported as their sheet words (AUTO, YES, SOLD…), formula columns filled. | ✅ |

## H. Legacy import

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| H1 | Dry run | `node scripts/import-master-sheet.mts --file "<xlsx>"` | 1,862 mapped (1,612 sold, 154 in stock, 96 returned to owner), 21 duplicates skipped, **1,862 of 1,862 total buying prices match the sheet**. Nothing written. | ✅ |
| H2 | Import | Add `--apply --company <uuid> --received-by <uuid>` | Rows appear with STOCK ID `L-<serial>`; re-running updates rather than duplicating. | ☐ |
| H3 | Legacy row check | Filter Legacy S/N **=** 1 | LT07 JDK: every column as row 5 of the Excel file; S - P £44.46. | ☐ |
| H4 | Sold legacy cars stay off the Work List | Advert → Work List | No legacy SOLD car appears. | ☐ |
| H5 | Original cell text kept | Open a car whose sheet said "82386 (KM)" | Mileage converted to miles; the original text is kept in the record's legacy data. **(auto)** | ☐ |

## I. Other meeting feedback (18 Sep 2026)

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| I1 | Returns under Warranty | Open the sidebar | "Returns and Cancellations" sits in the Warranties group (already the case before this round). | ✅ |
| I2 | Activity Log visible | Open the sidebar as Abbas Bhai | Administrative → Activity Log is listed; the page filters by user, category and date. | ✅ |
| I3 | No synthetic email on user cards | Sign in as a username-only account (no real email) | Sidebar card, profile menu, Users & Permissions grid, Edit roles and Remove member dialogs show the username, never `…@car-capital-uk.staff.carcapital.uk`. **(auto)** | ☐ |
| I4 | Real emails still shown | Sign in as abbas@carcapital.uk | The email shows as before. **(auto)** | ✅ |

## P. Performance (measured on a production build, dashboard, 1 vehicle)

| # | Test case | Steps | Expected | Status |
|---|---|---|---|---|
| P1 | No refetch on tab switch | Dashboard open → switch to another tab and back | No new network requests (was 4 — the profile twice and the backup check twice — every time). | ✅ |
| P2 | Dashboard request count | Hard-reload the dashboard | 22 Supabase requests (was 30: the whole activity log was fetched on every sign-in and never used). | ✅ |
| P3 | Data finished | Same | Last request done ≈2.9 s after navigation (was ≈10.5 s including the repeat loop). | ✅ |
| P4 | Buttons work on first load | Throttle the network to Slow 4G in DevTools, load any page, click a button as soon as it shows | The click works first time (Nord components now start loading before hydration, not after it). | ☐ |
| P5 | Full vehicle list past 1,000 rows | After the legacy import (~1,860 cars) | Master Sheet count and reports include every car (reads now page in 1,000-row blocks). **(auto)** | ☐ |

## Known data to tidy (found during UAT, not changed)

- **L400 JCM**: DATE SOLD is 27 Aug 2026 while the car is Ready / AVAILABLE.
- **L400 JCM**: VARIANT CODE holds the AutoTrader derivative id
  (`e3821ddf…`), left by the old form's auto-fill. New cars no longer get this.
