# Kanban boards

Every board in the app (the sales pipeline, the maintenance jobs board and the prep board) is built from these parts. The look follows the reference board at https://github.com/kargulstudio/kanban: lanes sit side by side on one surface, each with a status badge and a count, and the cards are white with a soft shadow. Pages own the data and the saving. The board owns the layout, the drag and the motion.

## Parts

| Export | File | Use it for |
|---|---|---|
| `KanbanBoard` | `kanban-board.tsx` | A board you can drag on. It takes `columns`, `items`, `getId`, `getColumnId`, `onMove` and `renderCard`. `compare` and `moved` place the drop slot, `onAdd` and `addLabel` add the "+" buttons, and `defaultHidden` starts columns in the hidden rail. |
| `KanbanFrame` | `kanban-board.tsx` | The board surface. It runs to the bottom of the window and scrolls sideways. Use it directly only for a board that doesn't drag. |
| `KanbanLane` | `kanban-board.tsx` | One column. The header shows the badge, name, count, an optional `summary` line and the `actions` buttons, and it stays fixed while the cards scroll and fade beneath it. |
| `KanbanEmpty` | `kanban-board.tsx` | An empty column: a dashed box saying "No jobs here yet", with the add button if the board has one. |
| `KanbanSkeleton` | `kanban-board.tsx` | The loading state. It shows the frame and lanes with pulsing card shapes. Use it on every board instead of a `Card` with `SkeletonBodyText`. |
| `KanbanCard` | `kanban-card.tsx` | The standard card. It shows the plate (`KanbanPlate`), then the title with the column's glyph, a quiet line with the vehicle and reference, the fact lines, an optional tinted note, and a footer of chips for the owner and the amount. |
| `KANBAN_CARD_SURFACE`, `KANBAN_CHIP` | `kanban-card.tsx` | Class strings for cards that can't use `KanbanCard` (the prep card), so they look the same. |
| `KanbanCardContext` | `kanban-card.tsx` | Gives a card its column so it can show the status glyph. `KanbanBoard` provides it. A board that doesn't drag wraps each card itself. |
| `StageIcon` | `stage-icon.tsx` | The column's status mark, worked out from where the column sits on the board: a ring that fills as the stages progress, a tick for done, and a pause or a cross for exceptions. `variant="badge"` draws it inside a small filled tile, for lane headers. The default `glyph` variant is for cards and the hidden rail. |

## Anatomy and tokens

- **Board:** `bg-(--kanban-board)` with a `border-(--border-secondary)` frame and `rounded-(--radius-300)`. Lanes are divided by hairline `border-r` borders. A lane is 85vw wide (max 340px) on a phone, 300px from `sm`, and `flex-1` from `lg` with a 272px minimum.
- **Lane header:** badge, then the name in `body-md-semibold`, then the count in `text-secondary`. The `summary` line sits under the name. If any column has a summary, every lane keeps that line's space, so card tops line up across the board. The header uses `shrink-0`.
- **Cards:** `rounded-(--radius-400)`, `p-4` body, `gap-3` between cards. The footer has a `border-t` and `px-4 py-3`, and holds the chips. Chips are rounded pills on `bg-(--bg-fill-transparent)` with no outline. The card's menu fades in on hover or focus with a mouse, and is always visible on touch.
- **Shadows:** `--kanban-card-shadow`, `-hover` and `-lift` are set for light and dark in `src/app/genaro-bridge.css`. Genaro's own shadows are bevelled and look wrong for white cards on a white board. In dark mode the board steps down a shade (`bg-surface-secondary`) so the cards sit above it.
- **No squashing:** the app's base styles set `min-height: 0` on every element. The lane's card list and each item in it must stay `shrink-0`, or the cards squash to fit the column instead of scrolling. If you add a part inside a lane, give it `shrink-0` too.

## States

- **Hover:** the shadow and outline get stronger. There is no colour change and no scaling.
- **Drag:** the image that follows the pointer is the card tilted -3° with the focus-tinted lift ring. Its old spot turns into a dashed box, and that box collapses once the pointer is over another column. A dashed slot the height of the card opens where the card will land (`compare` and `moved` decide where), and the other cards slide aside with a 0.3s spring and no bounce. The target lane takes the `--kanban-lane-target` tint. A dropped card settles in from 97% scale. Motion follows the user's reduced-motion setting through the app's `MotionConfig`.
- **Empty column:** a dashed box with "No {noun} here yet", plus the add button if the board has one.
- **Hidden columns:** shown in a 184px rail on the right with a "Show all columns" menu. Each row has the column's glyph, name and count, and you can drop a card on a row to move it there.
- **Loading:** `KanbanSkeleton`.

## Rules

- Keep photos behind `PHOTOS_ENABLED` (`thumbnail={v && PHOTOS_ENABLED ? … : undefined}`). Cards must look complete without a photo.
- Show urgency through a fact's `tone` (an overdue date in critical, today in caution), never by colouring the whole card.
- Give the title a link or button that opens the record, so keyboard users can open it. Mark links inside a card with `draggable={false}`.
- A new board should use `KanbanBoard` with `KanbanCard`. Don't build lanes or card surfaces by hand.
