# Empty-state illustrations: decided from /proto/empty-states (4 Nov 2026)

Four directions were built for the 44 page- and card-level empty states mapped in
[empty-states-map.html](empty-states-map.html) and compared at full size inside the real app shell.

**Picked: Preview.** Each empty state shows a ghosted miniature of its own screen once it has content, and the first
item lands where it will appear.

- One template per kind of screen, not one drawing per page: `list`, `kanban`, `calendar`, `gallery`, `checklist`,
  `timeline`, `search`, `lock`, `notFound`, `error`, `chart`, `detail`. Twelve shapes cover every empty state.
- Built from the screen's own materials: the surface, fill and border tokens, the brand fill for the item that lands,
  and the reg-plate yellow leading each row of a vehicle list (`plates`).
- 220×140 drawing, shown at 280px on a page and 200px in a dashboard card. It fades out at the bottom, so it reads as
  a glimpse of the screen, not a screenshot of it.
- Entrance: the frame fades in, then rows and lanes rise 4px into place, staggered 40–50ms, 460ms each,
  `cubic-bezier(0.23, 1, 0.32, 1)`.
- Idle loop, 4.6s: the dashed slot shows while the first item rises 10px into it (`pv-land`), holds, then fades so the
  slot shows again. Kanban glides in at an angle, calendar and the listing pill scale in from 0.88. Searches dim the rows
  as the lens sweeps; checklists tick through; the lock's shackle drops once; not-found rows drift out of their outline.
- `prefers-reduced-motion`: every animation off, everything at rest in its landed state.

**Rejected**

- **Current** (an icon in a grey tile): the baseline. Says nothing about the screen, and half the empty states had no
  icon at all.
- **Blueprint** (monoline drawings that draw themselves in): the most refined, but a drawing of a car or a clipboard is
  decoration. It tells you the topic, not what the screen will look like or where to start, and 20 bespoke drawings is
  a lot to keep consistent as screens are added.
- **Stacked** (solid objects with a layered slab, settling in and tilting toward the pointer): the most tactile and
  memorable, and the heaviest. Pointer parallax on a daily-use back-office tool is a novelty that wears off, and it read
  as a different product beside Genaro's flat surfaces.

**Not covered**: the three calendars still show a blank grid on a quiet week. Giving them an empty state is a separate
change (it needs a "nothing booked" condition), and `calendar` is ready for it.
