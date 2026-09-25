'use client';

import * as React from 'react';
import { Button } from './Button';
import { cx } from './utils';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DatePickerProps {
  /** A day, or a { start, end } range. */
  selected?: Date | DateRange;
  onChange?: (range: DateRange) => void;
  allowRange?: boolean;
  /** Two months side by side. */
  multiMonth?: boolean;
  /** 0–11; defaults to the selected (or current) month. */
  month?: number;
  year?: number;
  disableDatesBefore?: Date;
  disableDatesAfter?: Date;
  className?: string;
}

function sameDay(a: Date | null | undefined, b: Date | null | undefined) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface Selection {
  start: Date | null;
  end: Date | null;
}

/** Calendar for choosing a date or a date range. */
export function DatePicker({ selected, onChange, allowRange, multiMonth, month, year, disableDatesBefore, disableDatesAfter, className }: DatePickerProps) {
  const init: Selection =
    selected && !(selected instanceof Date) ? selected : { start: selected || null, end: selected || null };
  const [sel, setSel] = React.useState<Selection>(init);
  const [view, setView] = React.useState(() => {
    const now = init.start || new Date();
    return { m: month != null ? month : now.getMonth(), y: year || now.getFullYear() };
  });
  const [hover, setHover] = React.useState<Date | null>(null);
  const { m, y } = view;
  const before = disableDatesBefore ? new Date(disableDatesBefore.getFullYear(), disableDatesBefore.getMonth(), disableDatesBefore.getDate()) : null;
  const after = disableDatesAfter ? new Date(disableDatesAfter.getFullYear(), disableDatesAfter.getMonth(), disableDatesAfter.getDate()) : null;

  function renderMonth(mm: number, yy: number, showPrev: boolean, showNext: boolean) {
    const first = new Date(yy, mm, 1).getDay();
    const days = new Date(yy, mm + 1, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(yy, mm, d));
    while (cells.length % 7) cells.push(null);
    const st = sel.start;
    const en = sel.end || (allowRange && hover && st && hover > st ? hover : null);
    return (
      <div className="p-datepicker__month">
        <div className="p-datepicker__header">
          {showPrev ? (
            <Button variant="tertiary" icon="ArrowLeftMinor" accessibilityLabel="Previous month" onClick={() => setView({ m: (m + 11) % 12, y: m === 0 ? y - 1 : y })} />
          ) : (
            <span className="p-datepicker__spacer" />
          )}
          <span className="p-datepicker__title">{`${MONTHS[mm]} ${yy}`}</span>
          {showNext ? (
            <Button variant="tertiary" icon="ArrowRightMinor" accessibilityLabel="Next month" onClick={() => setView({ m: (m + 1) % 12, y: m === 11 ? y + 1 : y })} />
          ) : (
            <span className="p-datepicker__spacer" />
          )}
        </div>
        <div className="p-datepicker__grid" role="grid">
          {DOW.map((w) => (
            <span key={w} className="p-datepicker__dow">
              {w}
            </span>
          ))}
          {cells.map((c, i) => {
            if (!c) return <span key={i} />;
            const isStart = sameDay(c, st);
            const isEnd = sameDay(c, en);
            const inRange = !!st && !!en && c > st && c < en;
            const disabled = (!!before && c < before) || (!!after && c > after);
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                className={cx(
                  'p-datepicker__day',
                  (isStart || isEnd) && 'p-datepicker__day--selected',
                  inRange && 'p-datepicker__day--inrange',
                  allowRange && isStart && !!en && !isEnd && 'p-datepicker__day--first',
                  allowRange && isEnd && !!st && !isStart && 'p-datepicker__day--last',
                )}
                onMouseEnter={() => setHover(c)}
                onClick={() => {
                  const next: Selection = !allowRange
                    ? { start: c, end: c }
                    : !st || sel.end || c < st
                      ? { start: c, end: null }
                      : { start: st, end: c };
                  setSel(next);
                  onChange?.({ start: next.start as Date, end: (next.end || next.start) as Date });
                }}
              >
                {c.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const nm = (m + 1) % 12;
  const ny = m === 11 ? y + 1 : y;
  return (
    <div className={cx('p-datepicker', className)}>
      {renderMonth(m, y, true, !multiMonth)}
      {multiMonth ? renderMonth(nm, ny, false, true) : null}
    </div>
  );
}
