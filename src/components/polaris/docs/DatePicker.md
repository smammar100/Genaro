# DatePicker

A month calendar for picking a date or a date range, on its own raised surface (`shadow-300`). Selected days use `bg-fill-brand-selected`; days between use `bg-surface-brand-selected`.

```tsx
import { DatePicker, type DateRange } from '@/components/polaris';
```

## Use it for
- Choosing a specific day (ship-by date, scheduled publish date) or a range (`allowRange`, e.g. report periods).
- `multiMonth` for ranges that often cross months — two months side by side, arrows on the outer edges.
- Block impossible dates with `disableDatesBefore` / `disableDatesAfter`. They compare calendar days (time of day is ignored), so `disableDatesBefore={new Date()}` keeps today selectable.
- Usually shown next to, or opened from, a field or button that displays the chosen date as text.

## Examples

Single date that posts with a form (Client Component). There's no `name` prop, so mirror it into a hidden input — `en-CA` formats `YYYY-MM-DD` in local time:

```tsx
'use client';
const [date, setDate] = React.useState(new Date(2026, 8, 30));

<>
  <DatePicker selected={date} onChange={({ start }) => setDate(start)} disableDatesBefore={new Date(2026, 8, 25)} />
  <input type="hidden" name="shipBy" value={date.toLocaleDateString('en-CA')} />
</>
```

Date range across two months, no future dates:

```tsx
'use client';
const [range, setRange] = React.useState<DateRange>({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 14) });

<DatePicker allowRange multiMonth selected={range} onChange={setRange} disableDatesAfter={new Date(2026, 8, 25)} />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `selected` | `Date \| DateRange` | — | **Initial** selection only — later changes are ignored. Remount with a new `key` to reset it. |
| `onChange` | `(range: DateRange) => void` | — | Always `{ start, end }`. Single dates give `start === end`; in range mode the first click reports `{ start: day, end: day }`, the second the full range. |
| `allowRange` | `boolean` | — | Click a start day, then an end day; the range previews on hover. |
| `multiMonth` | `boolean` | — | Shows the following month too. |
| `month` | `number` | selected (or current) month | Initial month shown, 0–11. |
| `year` | `number` | selected (or current) year | Initial year shown. |
| `disableDatesBefore` | `Date` | — | Days before this date's day are disabled; the day itself stays enabled. |
| `disableDatesAfter` | `Date` | — | Days after this date's day are disabled; the day itself stays enabled. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Client component (`'use client'`). `Date` props serialize, so you can render it from a Server Component, but it's only a calendar there: `onChange` needs a Client Component. Without `selected`, `month` and `year`, the first month shown comes from `new Date()` — pass `month` and `year` so the server and browser render the same month.

## Accessibility
- Month arrows are labelled "Previous month" / "Next month"; days are plain buttons, reachable with Tab.
- Day buttons only say the day number, so show the chosen date as text next to the picker.
