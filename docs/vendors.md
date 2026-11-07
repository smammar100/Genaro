# Vendors — decided from /proto/vendors (7 Nov 2026)

Five directions were built behind a picker (emil-prototype), with sample, live and empty
data, against today's page (two tabs, a summary strip over each table).

## Picked: One list

Garages and dealer partners are both people the company deals with, so they share one
table instead of two tabs.

- One card: filter tabs (All, Garages, Dealer partners, each with its count) and a search
  field on top, the table under them. All is the default; `?tab=garages` and
  `?tab=dealer-partners` open the other two (the partner page's back link uses the second).
- Columns are today's, at the user's request (the prototype's "What they are", "Our cars
  with them" and "Spent" did not stay):
  - Garages: Name, Phone, Speciality, Active jobs, Total spent, Actions.
  - Dealer partners: Contact, Phone, Company, Active stock, Actions.
  - All: both sets together: Name, Phone, Speciality, Company, Active jobs, Active stock,
    Total spent, Actions. A column that doesn't apply to a row reads "—".
- All is sorted by name across both kinds; search matches name, phone, company and
  speciality.
- A garage row opens its edit dialog; a dealer partner row opens the partner's page. Both
  keep their menus (Edit, Delete; View for partners).
- Header: Add garage is the primary (Add dealer partner on the Dealer partners filter).
  On All, Add dealer partner sits beside it; Delete all garages / dealer partners shows on
  its own filter only, so a bulk delete is always scoped to one kind.
- The summary strips came off with the tabs: the counts sit on the filter tabs, and the
  totals are in the table's columns.

## Rejected

- **Directory** — a card per vendor with the number written out and Call one tap away.
  Fastest for "what's their number?", but a grid of cards is slow to scan past twenty and
  drops the money and job columns.
- **At their place** — garages ordered by how many of our cars they hold, each with its cars
  and the late ones called out. Answers "where are my cars?", but that question belongs to
  Prep & repair; here it pushed the contact details into second place.
- **By trade** — garages grouped by speciality, partners as Suppliers, one page without tabs.
  Good for "who does tyres?", but one card per trade made a short list long.
- **Profile** — list on the left, the picked vendor's profile beside it. No dialog to open,
  but it halves the list's width and is only a list on a phone.
