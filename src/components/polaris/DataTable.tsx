import * as React from 'react';
import { cx } from './utils';

export interface DataTableProps {
  headings: React.ReactNode[];
  rows: React.ReactNode[][];
  /** Right-aligns numeric columns with tabular figures. */
  columnContentTypes?: Array<'text' | 'numeric'>;
  /** A totals row (first cell is replaced by totalsName). */
  totals?: React.ReactNode[];
  totalsName?: string;
  showTotalsInFooter?: boolean;
  footerContent?: React.ReactNode;
  className?: string;
}

/** Read-only table of numbers for reports and analytics (no selection). */
export function DataTable({ headings, rows, columnContentTypes, totals, totalsName, showTotalsInFooter, footerContent, className }: DataTableProps) {
  const types = columnContentTypes || [];
  const num = (i: number) => (types[i] === 'numeric' ? 'p-num' : undefined);
  const totalsRow = totals ? (
    <tr>
      {totals.map((c, i) => (
        <td key={i} className={num(i)}>
          {i === 0 ? totalsName || 'Totals' : c}
        </td>
      ))}
    </tr>
  ) : null;
  return (
    <div className={cx('p-card p-card--flush p-datatable', className)}>
      <table>
        <thead>
          <tr>
            {(headings || []).map((c, i) => (
              <th key={i} className={num(i)}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        {showTotalsInFooter ? null : totals ? <tbody className="p-datatable__totals">{totalsRow}</tbody> : null}
        <tbody>
          {(rows || []).map((r, ri) => (
            <tr key={ri}>
              {r.map((c, i) => (
                <td key={i} className={num(i)}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {showTotalsInFooter && totals ? <tfoot>{totalsRow}</tfoot> : null}
      </table>
      {footerContent ? <div className="p-datatable__footer">{footerContent}</div> : null}
    </div>
  );
}
