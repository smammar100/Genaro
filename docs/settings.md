# Settings — decided from /proto/settings (7 Nov 2026)

Five directions were built behind a picker (emil-prototype, with the de-slop pass), on live
data, for a manager (every section) and for staff (My profile only), against today's page:
seven tabs over title-beside-card sections. The brief was a Configurations screen the user
liked: categories, a side list of sections, lists with toggles.

## Picked: Side list

Settings reads like a settings app: every section in one grouped list on the left, the
section on the right.

- The list is grouped: You (My profile), Company (Company details, Branding, Working hours),
  Stock (Inspection checklist, Locations), Sales (Sales pipeline, Lead channels), Data
  (Backup). Each item has its icon; the open one is highlighted. The list stays in view
  (sticky) while a long section scrolls.
- The section's title and one or two lines on what it does head the right side; the
  section's own cards follow. The sections no longer carry a title column of their own.
- Company is three sections instead of one long form: details, branding and working hours,
  each card saving on its own. Logos save the moment they're picked or removed.
- A manager lands on Company details, everyone else on My profile; staff see only My
  profile. `?section=` opens a section directly (the Backup due notification opens Backup)
  and follows the list as you move.
- On a phone the list becomes a Section menu above the section.

## Rejected

- **Categories** — the Configurations screen's two levels: category tabs in the header
  card, a sub-list with a line on each section. Closest to the brief, but two clicks to
  most sections, and You and Data are one section each, so the second level was often
  empty.
- **One page** — every section on one scrolling page with a sticky index that follows you.
  Everything findable with Ctrl+F, but the long lists (pipeline, channels, checklist) push
  the company forms a long way down.
- **Overview** — a home of cards with each section's live state ("15 channels, 1 hidden",
  "Never backed up"), opening a section on a page of its own. Good at a glance, but one
  more click before every change, on a page people visit to change something.
- **Rows** — one searchable list of settings with their values, simple ones editing in
  their row and lists opening in a side panel. Quick for one change, but the list sections
  felt hidden in a panel, and it splits Settings into two ways of editing.
