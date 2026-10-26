# UAT: vehicle page header (command header) and Overview figures

Decided 26 Oct 2026 from the vehicle overview prototypes (Storybook, now
deleted). Files: `src/components/vehicle-detail/vehicle-header-card.tsx`,
`src/components/vehicle-detail/overview-stats.tsx`,
`src/components/vehicle-detail/overview-tab.tsx`.

## Decision

- **Header: command header.** The header card keeps back, plate, status menu,
  days-in-stock chip, name, variant and facts. A band along its bottom adds a
  progress line from Received to Sold (one segment per stage, the stage named
  underneath), "Next: …" with the open to-dos as a link, and the page's
  actions (the next step's button; Remove from website once sold). The next
  step moved from the top right into that band.
- **Overview: stat strip.** The four KPI cards and the AutoTrader valuation
  card became one card: web price, net profit, days in stock and AT retail
  split by hairlines, AutoTrader's trade / part-ex / retail on one line with
  Refresh, then the price-vs-market meter. Pricing, location and sales
  highlights follow, three across on a wide screen.
- **Card row: banded.** Pricing, Location and Sales highlights sit three
  across, each a `BandedCard`: an icon header with a one-line summary
  ("£16,995 web · £15,950 floor", "Garage · 4 days", "70,624 mi · full
  history"), its actions as plain links top right of the header (Edit, or
  Cancel + Save while editing, on Pricing; Move vehicle on Location), and one
  fact per row below (label left, value right, any note under it). Full
  history left the card: it lives on the vehicle's Location tab, which also
  has Mark returned.
  Rejected for the cards: Aligned rows, Headline (big lead figures), Joined
  panel (one hairline-split card), Attention (status badges and warnings) and
  Direct edit (click-to-edit prices, location dropdown).
- Rejected in round 1: **Market band** (one scale for every price; pricing
  edited in a modal), **Product detail** (two-thirds / one-third split),
  **Ledger** (one column of labelled rows). Rejected in round 2: **One hero**
  (figures above the tabs, so they repeat on every tab and push the tabs
  down) and **Progress rail** (vertical stages in a side rail, which narrows
  every tab).

## Test cases

| # | Test case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 1 | Progress line | Open a vehicle in each status | Done stages green, current stage brand, later ones grey; label reads "<Stage> · stage n of 7". A returned car shows all grey and "Returned". | ☐ |
| 2 | Next step | Read the band | "Next: <step>" matches the primary button; sold cars read "Sold, nothing left to do". | ☐ |
| 3 | To-do link | Car with open to-dos | "N things to do" opens the Things to do tab; the count matches the tab badge. Closing a to-do updates both. | ☐ |
| 4 | Remove from website | Sold car still on the website | Critical button in the band; confirm removes it. | ☐ |
| 5 | Stats card | Open Overview | Web price (floor under it), Net profit (live), Days in stock (stocking burn under it, amber at 60+, red at 90+), AT retail avg with its hint. | ☐ |
| 6 | Valuation row | Click Refresh | Spins, then trade / part-ex / retail and "Updated …" refresh. | ☐ |
| 7 | Meter | Priced and valued car | Meter and verdict under the valuation row; hidden without a price or valuation. | ☐ |
| 8 | Nothing lost | Compare with the old Overview | Every figure, hint, fact and action from the old header and Overview is still on the page. | ☐ |
| 9 | Narrow window | Half-screen | Tiles go 2 × 2; the band stacks the progress line above the next step. | ☐ |
| 10 | Light and dark | Toggle theme | Hairlines, band and progress colours read correctly. | ☐ |
| 11 | Card row | Overview on a laptop-width window | Pricing, Location and Sales highlights in one row, equal height, headers level. | ☐ |
| 12 | Card summaries | Read the three headers | Pricing: "£x web · £y floor" or "Not priced yet"; Location: "<place> · n days"; Sales highlights: mileage and service history, or "Nothing recorded yet". | ☐ |
| 13 | Edit pricing | Edit in Pricing's header | Fields open in the body with the floor hint; Cancel and Save replace Edit in the header; saving updates the summary and the stats card. | ☐ |
| 14 | Move vehicle | Move vehicle in Location's header | The move dialog opens; after a move the summary and recent moves update. The full history is on the Location tab. | ☐ |
| 15 | MOT flag | Car with MOT due within 30 days, and one expired | "Due soon" (amber) or "Expired" (red) under the date. | ☐ |
