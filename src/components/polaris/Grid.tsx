import * as React from 'react';
import type { Breakpoints } from './types';
import { cx } from './utils';

const BPS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const DEFAULT_COLUMNS: Required<Breakpoints<number>> = { xs: 6, sm: 6, md: 6, lg: 12, xl: 12 };

function bpVars(prefix: string, val: number | string | Breakpoints<number> | undefined, def: Required<Breakpoints<number>>) {
  const out: Record<string, number | string> = {};
  if (typeof val === 'number' || typeof val === 'string') {
    for (const b of BPS) out[`--p-${prefix}-${b}`] = val;
    return out;
  }
  const v = val || def;
  let last: number | undefined;
  for (const b of BPS) {
    const own = v[b];
    if (own != null) last = own;
    else if (last == null) last = def[b];
    out[`--p-${prefix}-${b}`] = last as number;
  }
  return out;
}

export interface GridProps {
  /** Columns per breakpoint; defaults to 6 (xs–md) and 12 (lg, xl). Unset breakpoints inherit the previous one. */
  columns?: number | Breakpoints<number>;
  /** Gutter, e.g. "var(--space-400)" (the default). */
  gap?: string;
  /** Centers the grid at its maximum width. */
  fixedWidth?: boolean;
  /** Shows the column overlay (design aid). */
  showColumns?: boolean;
  /** CSS grid-template-areas. */
  areas?: string;
  children?: React.ReactNode;
  className?: string;
}

export interface GridCellProps {
  /** Columns spanned per breakpoint (defaults to the full row). */
  columnSpan?: number | Breakpoints<number>;
  /** A grid-area name from Grid `areas`. */
  area?: string;
  children?: React.ReactNode;
  className?: string;
}

function GridBase({ columns, gap, fixedWidth, showColumns, areas, children, className }: GridProps) {
  const style: Record<string, number | string> = { ...bpVars('grid-cols', columns, DEFAULT_COLUMNS) };
  if (gap) style['--p-grid-gap'] = gap;
  if (areas) style.gridTemplateAreas = areas;
  return (
    <div className={cx('p-grid-container', fixedWidth && 'p-grid-container--fixed', className)}>
      <div className={cx('p-grid', showColumns && 'p-grid--overlay')} style={style as React.CSSProperties}>
        {showColumns ? (
          <div className="p-grid__overlay" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="p-grid__col" />
            ))}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/** A cell of the Grid. Also available as `Grid.Cell`. */
export function GridCell({ columnSpan, area, children, className }: GridCellProps) {
  const span = columnSpan != null ? columnSpan : DEFAULT_COLUMNS;
  const style = { ...bpVars('cell-span', span, DEFAULT_COLUMNS), ...(area ? { gridArea: area } : null) };
  return (
    <div className={cx('p-grid__cell', className)} style={style as React.CSSProperties}>
      {children}
    </div>
  );
}

/** The column grid: 12 columns at lg/xl, 6 at xs–md, 16px gutters (container-query driven). */
export const Grid = Object.assign(GridBase, { Cell: GridCell });
