/**
 * The sheet's totals footer, pinned to the bottom of the grid: a count under
 * the pinned identity columns, then a sum under each money column that has
 * one (computed over the filtered rows by the caller).
 */
export function TotalsRow({
  label,
  labelSpan,
  cells,
}: {
  /** "40 cars · 1 filter". */
  label: string;
  /** Columns the label spans: the selection column plus the pinned ones. */
  labelSpan: number;
  /** One per remaining column, in order; null leaves the cell blank. */
  cells: { key: string; content: string | null }[];
}) {
  const cell =
    "sticky bottom-0 border-t border-(--border) bg-(--bg-surface-secondary) px-2 py-2 body-sm text-(--text-secondary)";
  return (
    <tfoot>
      <tr>
        <td
          colSpan={labelSpan}
          className={`${cell} left-0 z-30 whitespace-nowrap shadow-[1px_0_0_var(--border)]`}
        >
          {label}
        </td>
        {cells.map((c) => (
          <td key={c.key} className={`${cell} z-20 text-right`}>
            {c.content ? (
              <div className="truncate body-md-numeric text-(--text)" title={c.content}>
                {c.content}
              </div>
            ) : null}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}
