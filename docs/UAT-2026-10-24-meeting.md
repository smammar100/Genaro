# Car Capital feedback call — 2026-10-24

Recording (33 min): https://fathom.video/share/XWLEBauDf6d_CDxWJDzK3h1uPPJDdG3S

The transcript is mixed English, Urdu and Hindi and the auto-transcription is
rough in places. Anything that is not clear from the recording is marked ❓
below and needs confirming with Car Capital.

Status legend: ✅ already works · 🔧 in this pass · ⏳ waiting on Car Capital ·
❓ needs clarifying · 🔜 later, agreed on the call

---

## Action-item tracker

| # | Item | Area | Status |
|---|------|------|--------|
| 1 | Core-facts card on the vehicle Overview (4 fields, shown large) | Vehicle detail | 🔧 *Sales highlights* card built · ⏳ confirm the 4 fields with Car Capital |
| 2 | Book an appointment from a lead card's ⋯ menu, with a calendar icon on the card | Sales / Calendar | 🔧 |
| 3 | V5 (logbook) tracking: DVLA deadline, "Return to owner" | Vehicle detail | ❓ |
| 4 | Courtesy car location and tab | Locations | 🔧 (needs migration 0052) |
| 5 | Available stock excludes sold and returned-to-owner cars | Inventory | 🔧 |
| 6 | Margin VAT = 20% of margin | Financials | 🔧 vehicle tabs · ❓ invoices |
| 7 | Change the vehicle on a lead or deal (customer buys a different car) | Sales | 🔧 |
| 8 | All vehicles as a table of active cars: no photos, sort by newest / make / model, location column; Cards / Table switch | Inventory | 🔧 |
| 9 | Forgot password goes to the super admin, who issues a temporary password | Auth / Admin | ✅ admin reset · 🔜 forgot-password request (next) |
| 10 | Product name and domain | — | 🔜 stay on the Vercel URL internally, new domain at launch |
| 11 | Link the maintenance calendar to the sales pipeline | Maintenance / Sales | 🔜 in a month or two |
| 12 | Move the existing uploaded data into the new structures | Data | 🔜 |
| 13 | In-app chat between users, with who's online | Shell | 🔜 own piece of work |
| 14 | AI chat, tax and report generation | — | 🔜 separate session with Car Capital first |

---

## Pointers

### 1. Core-facts card on the Overview (0:42–3:20)
- When a customer phones about a car, staff need three or four facts
  immediately. Today they're spread across tabs.
- First idea was a new tab; agreed instead to put a card on **Overview**.
- Keep **Pricing** and **AutoTrader valuation** where they are. Remove the
  **Manage** card (`vehicle-header-card.tsx`) and put the new card **between
  Pricing and AutoTrader valuation**, in big type.
- The left column moves right a little; the cards get larger and less
  compact.
- It should stay pinned while scrolling, the way Manage does now.
- ⏳ Car Capital is sending the four fields on WhatsApp. Service history was
  mentioned, but there isn't much data for it yet.
- Done 25 Oct: the Manage card is gone and the tab panel takes the full
  width; the tab row spreads across it; the header's specs carry icons; the
  advert panels (Advert completeness, Marketplace) are hidden while Phase 1
  runs no adverts (`ADVERTS_ENABLED` in `lib/phase-one.ts`).
- Built 25 Oct, per Ammar: a **Sales highlights** card in Marketplace's place
  (right column, beside Location) with **mileage, service history, MOT expiry
  and previous owners**, set like the other Overview cards'
  figures; the MOT flags *Due soon* within 30
  days and *Expired* after. Swap the fields in `sales-highlights-card.tsx` if
  Car Capital's WhatsApp list differs.

### 2. Appointments from the card (3:25–8:20)
- On a lead card's ⋯ menu add **Book appointment**.
- Show a small calendar icon on a card that has an appointment.
- From customer details, book either a viewing/test drive or a
  **collection date**.
- The appointment lands on the Appointments calendar, prefilled with the car
  and the customer's details.
- ❓ "The time will be 9–9": either the default slot starts at 09:00, or
  bookable hours are 09:00–21:00. Confirm which.
- Built: a calendar button on every open card in the **Sales pipeline** and
  the **Maintenance pipeline** (and *Book appointment* in the card's ⋯ menu).
  It opens the calendars' own booking form filled from the card and saves
  through the calendars' own writes (`components/calendar/event-actions.ts`):
  - Sales deal → a new appointment with the deal's customer and car, linked
    to its lead. Shows on Appointments, the Master calendar, the vehicle's
    Appointments tab and the dashboard; the card shows the next booking.
  - Maintenance job → the job itself is booked into the slot (due date and
    time), not duplicated. Shows on the Maintenance and Master calendars.
  - Defaults to 09:00 (today, or the job's due date if still ahead), within
    working hours.
- Booking also still works through *Update status → Appointment booked* on
  the Leads page.

### 3. V5 / DVLA (8:20–8:40)
- Example on the call: a car whose V5 was sent to DVLA but never issued; the
  scanned copy is the only record.
- Asked for: a deadline field for the DVLA follow-up and an email reminder
  when it passes, and an option for **Return to owner**.
- "Returned to owner" already exists as a sale status (master sheet
  AVAILABLE / SOLD column).
- ❓ Is "Return to owner" here the same sale status, or a separate V5 action
  (sending the logbook back to the owner)? Who gets the reminder email, and
  how many days is the deadline?

### 4. Courtesy car location (8:40–9:15)
- Add **Courtesy car** next to Forecourt, Yard, Garage and Staff, as a move
  destination and as its own tab on the Locations page.
- Needs migration 0052 to widen the location check constraints, applied to the
  hosted project like 0051.

### 5. Available stock (9:14–9:40, 21:30–22:40)
- Sold cars must not show in the available list, and neither must cars
  **returned to the owner** (never sold, not ours any more).
- "Available" = not sold and not returned to the owner. That includes cars
  still in readiness/prep.
- The forecourt list should only show those cars.

### 6. Margin VAT (10:00–11:30)
Car Capital's rule: total cost = purchase cost + **every** expense on the car;
margin = what the car **sold for** − total cost; **VAT = 20% of the margin**.
A separate accounting module and VAT ledger will come later.

How the app worked before this pass. Three calculations, none of them the rule
above:

| Where | Cost taken off | Price used | VAT |
|---|---|---|---|
| Vehicle Overview, "Net profit" KPI | base cost, no point-of-sale expenses | web price, even after the sale | margin × 0.2 / 1.2 (1/6) |
| Vehicle Financials, VAT panel | base cost, no point-of-sale expenses | web price + add-ons | margin × 0.2 / 1.2, then add-ons added a second time in "Net profit (SIV)" |
| Sale invoices (`vat.ts`, `invoice-calc.ts`) | total buying price only (price + fees + VAT paid) | invoice price | margin ÷ 6, add-ons 20% |

Base cost = total buying price + other charges + loading/unloading + value
addition + stocking charges + warranty cost. Point-of-sale expenses (finance
charges, partner's share, extended warranty, road tax, insurance, other jobs,
delivery to customer) sit outside it.

What changed:
- One calculation, `src/lib/car-margin.ts`, now drives both vehicle tabs:
  sale price (sold price once sold, else web price) − (base cost +
  point-of-sale expenses) = margin; VAT = 20% of a positive margin; profit =
  margin − VAT.
- Financials counts paid add-ons once, after the car's VAT, and shows the
  sale price instead of the web price once the car has sold.
- The master sheet's "S − P" and the stored "Est. profit" have no VAT in them
  and are unchanged.

Not changed: **sale invoices**. They record output VAT for the VAT return,
and HMRC's margin scheme takes 1/6 of (selling price − purchase price),
because the selling price already includes the VAT. Expenses aren't
deductible there. ❓ Confirm with Car Capital's accountant before invoices
follow the 20%-of-margin rule.

### 7. Change the vehicle on a lead or deal (11:30–13:00)
- A lead comes in for a Polo but the customer ends up buying a different car.
- Allow editing the linked vehicle on the lead (Leads page) **and** on the
  deal card in the Pipeline.
- Today a lead's vehicle can only be set when it has none.

### 8. All vehicles as a table (13:00–22:30)
- The card list on All vehicles is "not that nice". Wanted: a **table** like
  Click Dealer's *Adverts → Work list*, with no photos.
- Columns: reg, make, model, fuel, days in stock, **location**. Drop the
  extras.
- Sort by **newest**, **make**, **model**. "Newest arrivals" was sorting by
  days in stock; rename it and sort by arrival date.
- It lists active cars only (see 5).
- Built: first as a separate *In stock* page; then, per Ammar (25 Oct), **All
  vehicles itself** became that table, holding active cars only, and the In
  stock page was removed. Sold and returned-to-owner cars live on the master
  sheet. Location tabs, search, sort by heading, and a **Cards / Table**
  switch (cards four to a row, with a sort menu; the choice is remembered per
  browser).

### 9. Forgot password (22:40–24:30)
- Three or four users are live now. If one forgets their password, the
  **super admin** should get an email and reset it for them.
- ✅ Admins can already reset a member's password from Users & permissions;
  this generates a temporary password that must be changed on next login.
- 🔜 The *Forgot password* page sends Supabase's reset email to the user's
  own address, which staff with username logins (synthetic emails) never
  receive. It should notify the admin instead. Not started yet.

### 10. Product name and domain (24:30–28:30)
- Genaro is the parent company, so the product needs its own name ("Genaro
  Alpha" was floated). A subdomain of genaro.co.uk was discussed.
- Agreed: keep using the Car Capital Vercel URL internally; move to a new
  domain once the product is live.

### 11. Maintenance calendar ↔ pipeline (28:40–29:40)
- Link the maintenance calendar to the sales pipeline, so a car being sold
  shows when its maintenance is due. Later, in a month or two.
- The Inspection queue's table view was called out as good. Use it as the
  model for other tables.

### 12. Existing data (29:40–30:20)
- Move everything uploaded so far into the new inventory and pipeline
  structures.

### 13. In-app chat (30:20–31:00)
- Users can message each other. A small panel in the sidebar shows who's
  online, with instant messages.

### 14. AI chat and reports (31:00–32:00)
- An AI chat could sit in the same panel. First, a separate session with
  Car Capital to agree the flow. Tax and report generation come after the
  next stage.

---

## Not for the build
- Click Dealer login trouble (wrong username or email on file). Car Capital is
  resending the credentials.
