# All vehicles — decided from /proto/vehicles (6 Nov 2026)

Three directions were built with live stock behind a picker (emil-prototype), with the
finishing skills as the bar (polish, touch, mobile, performance, unslop, review).

## Picked: Compact

Density for scanning the whole stock many times a day.

- Condensed rows, 37px (the 32px cell plus a 24px badge); about 17 cars on a 900px screen
  against 11 before.
- Columns: Registration (plate), Vehicle (make and model, then the year in grey), Fuel,
  Status, Location, MOT, In stock, and Move as an icon at the row's end.
- No quick filters. The prototype had MOT due / Over 90 days / Reserved beside the search;
  they came off at the user's request: the tabs and search are enough.
- In stock reads `14d`, right-aligned with its heading (the column the user circled: the
  heading sat ~20px left of its numbers). Cars over 90 days are in the main text colour, the
  rest grey.
- MOT: the date, red within 60 days, "Expired" once past.
- Status: one weight for every state (Genaro Badge with a progress pip), so Reserved no
  longer shouts over Received.
- Move: a 16px glyph at stroke 1.75 in a micro tertiary button, labelled for screen readers;
  44px hit area on touch.
- Header: Master sheet only on a computer (the sidebar's Add vehicle is the one primary);
  Add vehicle comes back in the header below lg, where the sidebar is a drawer.
- Dates: `26 Sep 2027` (en-GB had written "Sept" beside "Dec").

## Rejected

- **Refined** — the same table at full height with the car's facts under its name. The
  clearest single row, but about 11 cars a screen: too much scrolling for a list the yard
  reads all day.
- **Split** — list and detail, arrow keys through the stock. Good for browsing one car at a
  time, but it halves the list's width and hides the details on a phone, where it is just a
  list.

## Design-system fixes found on the way

- Micro buttons drew a 20px icon in a 24px button; their icons are 16px now.
- `IndexTable condensed` set 32px cells but kept 12px padding, so any badge grew the row
  back to ~50px; condensed cells pad 4px. (2026-11-07: every table is 32px now and the
  `condensed` prop is gone.)
- Right-aligned sortable headings kept their hidden sort arrow on the right, so the label
  never lined up with its numbers; the arrow sits on the left in those columns.
- `formatDate` wrote "Sept"; it writes "Sep" like the other months.
