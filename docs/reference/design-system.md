# Design system

> **Audience:** developers + designers + AI agents
> **Last verified:** 2026-11-07

The app's UI is **Genaro**, in `src/components/genaro` (import from `@/components/genaro`). The rules live in `CLAUDE.md`; this page says where things are.

## Where to look

| What | Where |
|---|---|
| How to use Genaro, and the component list | `src/components/genaro/README.md` |
| One component's guidelines and props | `src/components/genaro/docs/<Component>.md` |
| Every component, live | Storybook: `pnpm storybook` (port 6006) |
| Tokens (colour, spacing, radius, shadow) | `src/components/genaro/styles/tokens.json`, generated into `tokens.css` |
| Type scale (five sizes) | `src/lib/type-scale.ts` and the Genaro type classes |
| App-level skin (sidebar, tables, kanban tokens) | `src/app/genaro-bridge.css` |
| Checks before finishing UI work | `node src/components/genaro/tools/audit.mjs src/app src/components` |

`src/components/ui` is the old shadcn layer, being removed: never import from it in new code.

## Data grid

`src/components/data-grid` holds the building blocks for the dense, editable tables (the master sheet, completed sales, dealer partners). Everything else uses Genaro's `IndexTable` or `DataTable`. Every table's rows are 32px.

| Export | Purpose |
|---|---|
| `DataGridShell`, `DataGridTable`, `DataGridHeaderRow`, `DataGridRow` | The table, in a Genaro Card |
| `ColumnDef<T>` | Column schema: key, header, type, width, alignment, sticky |
| `DataGridPagination` | Rows per page, the range shown, and page arrows |
| `DataGridColumnsButton`, `useColumnVisibility` | Show and hide columns |
| `DataGridDensityToggle`, `useDensity` | Row height: compact (32px, the default), normal, comfortable |
| `useSort` | Sort state for header clicks |
| `DataGridGroupHeaderRow`, `useRowGroups`, `GROUP_INDENT` | Collapsible groups (a year, then its months), indented by level |
| `VehicleCell`, `UserCell`, `AtIndicatorCell` | Shared cells |

The case study behind the data grid is [`docs/case-studies/data-tables.md`](../case-studies/data-tables.md).
