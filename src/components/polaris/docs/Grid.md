# Grid

The admin column grid: 6 columns at xs–md and 12 columns at lg–xl, with 16px (`space-400`) gutters. Breakpoints follow the grid's own width.

```tsx
import { Grid, GridCell } from '@/components/polaris';
```

## Use it for
- Dashboards and tile layouts, such as stat tiles, app cards and report widgets. For the standard main-plus-sidebar page, use `Layout`.
- Breakpoints are measured on the grid's container width (a container query), not the viewport: xs < 490 · sm ≥ 490 · md ≥ 768 · lg ≥ 1040 · xl ≥ 1440.
- `Grid.Cell` (also exported as `GridCell`) spans `columnSpan` columns: a number, or `{ xs, sm, md, lg, xl }`. A breakpoint you leave out inherits the next smaller one, and an unset `xs` means the full row.
- A span larger than the current column count is clamped, so `columnSpan={8}` is full width at xs–md (6 columns). A cell with no `columnSpan` fills the whole row.
- `columns` changes the column count per breakpoint. With custom columns, give every cell a `columnSpan`, because the default is a full row.
- `Page` supplies the side margins, so don't pad the grid. `fixedWidth` caps the grid at 1440px and centers it. `showColumns` draws the pink column overlay for layout reviews.
- `areas` sets CSS `grid-template-areas`, and a cell's `area` places it. The template doesn't change across breakpoints, so keep `columns` fixed when you use it.

## Examples

Stat tiles: four across at lg, two across at sm and md, and one per row on phones:

```tsx
<Grid>
  <Grid.Cell columnSpan={{ xs: 6, sm: 3, lg: 3 }}>
    <Card title="Total sales">$12,480.00</Card>
  </Grid.Cell>
  <Grid.Cell columnSpan={{ xs: 6, sm: 3, lg: 3 }}>
    <Card title="Orders">1,284</Card>
  </Grid.Cell>
  <Grid.Cell columnSpan={{ xs: 6, sm: 3, lg: 3 }}>
    <Card title="Returning customers">24%</Card>
  </Grid.Cell>
  <Grid.Cell columnSpan={{ xs: 6, sm: 3, lg: 3 }}>
    <Card title="Conversion rate">3.2%</Card>
  </Grid.Cell>
</Grid>
```

A chart plus a list, 8 and 4 columns at lg and stacked below that, using the flat name:

```tsx
<Grid>
  <GridCell columnSpan={{ xs: 6, lg: 8 }}>
    <Card title="Sales over time">$12,480.00 this month, up 12%</Card>
  </GridCell>
  <GridCell columnSpan={{ xs: 6, lg: 4 }}>
    <Card title="Top products">Mid-century armchair</Card>
  </GridCell>
</Grid>
```

Custom columns for equal cards, with one, two or three per row. Each cell needs `columnSpan={1}`, and `apps` is your data:

```tsx
<Grid columns={{ xs: 1, sm: 2, lg: 3 }}>
  {apps.map((app) => (
    <Grid.Cell key={app.id} columnSpan={1}>
      <Card title={app.name}>{app.description}</Card>
    </Grid.Cell>
  ))}
</Grid>
```

## Props

`Grid`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `columns` | `number \| Breakpoints<number>` | `{ xs: 6, sm: 6, md: 6, lg: 12, xl: 12 }` | A breakpoint you leave out inherits the previous one. |
| `gap` | `string` | `'var(--space-400)'` | Any CSS length. |
| `fixedWidth` | `boolean` | — | `max-width: 1440px`, centered. |
| `showColumns` | `boolean` | — | Column overlay (design aid). It always draws the 6/12-column set. |
| `areas` | `string` | — | CSS `grid-template-areas`. |
| `children` | `ReactNode` | — | `Grid.Cell` elements. |
| `className` | `string` | — | Classes on the outer container. |

`Grid.Cell` / `GridCell`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `columnSpan` | `number \| Breakpoints<number>` | full row | Clamped to the current column count. |
| `area` | `string` | — | A name from the Grid's `areas`. |
| `children` | `ReactNode` | — | |
| `className` | `string` | — | |

## Server Components
Grid is not a client component. It renders from Server Components, and `Grid.Cell` and `GridCell` both work everywhere.
