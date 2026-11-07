# TableFilterMenu and TableSortMenu

Rule-based filtering and sorting for a table, after tablecn's advanced toolbar (2026-11-07): a **Filter** button and a **Sort** button, each with the number of rules on it, opening the list of rules. The rules are plain data, and `applyTableFilters` / `applyTableSort` run them over the rows you hold.

```tsx
import {
  TableFilterMenu,
  TableSortMenu,
  applyTableFilters,
  applyTableSort,
  type TableFilterField,
  type TableFilterRule,
  type TableJoin,
  type TableSortRule,
} from '@/components/genaro';
```

## Use it for
- The toolbar inside a table's card: Sort, then Filter, with the search at the other end. The master sheet shows Filter with a Columns button beside it, and sorts from its column headers instead of a Sort button.
- Each filterable column is a `TableFilterField` with a `variant`, which decides the conditions it offers and the value it takes:
  - `text`: contains, does not contain, is, is not, is empty, is not empty. A text box.
  - `number`: is, is not, is at least, is at most, is more than, is less than, is between, empty. Numbers read in words, not "≥".
  - `date`: is, is not, is before, is after, is on or before, is on or after, is between, empty. A date field, two for between.
  - `select`: is any of, is none of, empty. A searchable list of the field's `options`; give each a `count` (`countTableValues`) and it shows beside the value.
  - `boolean`: is yes or no.
- The second rule's join switches every rule between **and** (all of them) and **or** (any of them). A rule still waiting for its value narrows nothing, so a person can build a rule without the rows flickering away.
- Sorting is a list too: the first rule orders the rows, each later one breaks the ties of those before it. Blank cells sort last in either direction.
- Keyboard: Ctrl/⌘ + Shift + F opens Filter, Ctrl/⌘ + Shift + S opens Sort; Backspace on either button removes its last rule. Add filter and Add sort put focus in the new rule's column picker.
- On a phone each filter rule stacks: its join word and remove button, then the column, the condition and the value, each the panel's full width.
- Column headers can offer the same sorting from a menu (Sort ascending, Sort descending, Clear sort, Hide column); the master sheet's headers do. A header's choice replaces the sort; the Sort button builds sorts on several columns.

## Don't
- Don't use these for a short list with one obvious filter: tabs or a few `FilterPill`s read faster.
- Don't run the rules on the visible page only: filter and sort the whole set, then page it.

## Example

```tsx
'use client';
const fields: TableFilterField[] = [
  { id: 'make', label: 'Make', variant: 'text' },
  { id: 'mileage', label: 'Mileage', variant: 'number' },
  { id: 'location', label: 'Location', variant: 'select', options: [{ value: 'Forecourt', label: 'Forecourt', count: 97 }] },
  { id: 'dateSold', label: 'Date sold', variant: 'date' },
];
const [rules, setRules] = React.useState<TableFilterRule[]>([]);
const [join, setJoin] = React.useState<TableJoin>('and');
const [sorting, setSorting] = React.useState<TableSortRule[]>([]);

const get = (car: Vehicle, field: string) => car[field as keyof Vehicle];
const rows = applyTableSort(applyTableFilters(cars, rules, join, fields, get), sorting, get);

<TableSortMenu fields={fields} sorting={sorting} onChange={setSorting} />
<TableFilterMenu fields={fields} rules={rules} join={join} onChange={(r, j) => { setRules(r); setJoin(j); }} />
```

## Props

### TableFilterMenu
| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `fields` | `TableFilterField[]` | — | `{ id, label, variant, options?, placeholder? }`. |
| `rules` | `TableFilterRule[]` | — | `{ id, field, operator, value }`; `value` is a pair for between and a list for any of / none of. |
| `join` | `'and' \| 'or'` | — | How the rules combine. |
| `onChange` | `(rules, join) => void` | — | After every edit. |
| `shortcut` | `boolean` | `true` | Ctrl/⌘ + Shift + F. |
| `preferredAlignment` | `'left' \| 'right'` | left | Which edge of the button the panel lines up with. |

### TableSortMenu
| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `fields` | `{ id, label }[]` | — | The sortable columns. |
| `sorting` | `TableSortRule[]` | — | `{ field, desc }`, first rule first. |
| `onChange` | `(sorting) => void` | — | After every edit. |
| `shortcut` | `boolean` | `true` | Ctrl/⌘ + Shift + S. |
| `preferredAlignment` | `'left' \| 'right'` | left | |

### Functions
- `applyTableFilters(rows, rules, join, fields, get)` — the rows that pass; `get(row, fieldId)` reads a cell.
- `applyTableSort(rows, sorting, get)` — the rows in the rules' order.
- `countTableValues(rows, read)` — each value's row count, for a select field's options.
- `defaultTableRule(field)`, `withTableOperator(rule, variant, operator)`, `isTableRuleActive(rule, field)`, `matchesTableRule(value, rule, variant)`.
