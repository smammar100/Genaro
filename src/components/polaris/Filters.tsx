import { Button } from './Button';
import { Icon } from './Icon';
import { TextField } from './TextField';
import { cx } from './utils';

export interface FilterPillProps {
  label: string;
  /** Applied filter: shows a remove (×) button. */
  active?: boolean;
  /** The "Add filter" pill. */
  add?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  magic?: boolean;
  className?: string;
}

/** One filter in a Filters bar. */
export function FilterPill({ label, active, add, onClick, onRemove, magic, className }: FilterPillProps) {
  return (
    <span className={cx('p-filterpill', active && 'p-filterpill--active', magic && 'p-filterpill--magic', className)}>
      <button type="button" className="p-filterpill__btn" onClick={onClick}>
        <span>{label}</span>
        {add ? <Icon source="PlusMinor" /> : active ? null : <Icon source="ChevronDownMinor" />}
      </button>
      {active ? (
        <button type="button" className="p-filterpill__remove" aria-label={`Remove ${label}`} onClick={onRemove}>
          <Icon source="CancelSmallMinor" />
        </button>
      ) : null}
    </span>
  );
}

export interface FilterDefinition {
  key: string;
  label: string;
  /** Open your filter UI (e.g. a Popover with a ChoiceList). */
  onClick?: () => void;
}

export interface AppliedFilter {
  key: string;
  /** e.g. "Status: Active". */
  label: string;
  onRemove?: () => void;
}

export interface FiltersProps {
  queryValue?: string;
  onQueryChange?: (value: string) => void;
  onQueryClear?: () => void;
  queryPlaceholder?: string;
  filters?: FilterDefinition[];
  appliedFilters?: AppliedFilter[];
  onClearAll?: () => void;
  /** Called by the "Add filter" pill. */
  onAddFilterClick?: () => void;
  className?: string;
}

/** Search field plus filter pills for an index list. */
export function Filters({ queryValue, onQueryChange, onQueryClear, queryPlaceholder, filters, appliedFilters, onClearAll, onAddFilterClick, className }: FiltersProps) {
  const applied = appliedFilters || [];
  return (
    <div className={cx('p-filters', className)}>
      <div className="p-filters__query">
        <TextField
          label="Search"
          labelHidden
          prefix="SearchMinor"
          placeholder={queryPlaceholder || 'Filter items'}
          value={queryValue}
          onChange={onQueryChange}
          clearButton
          onClearButtonClick={onQueryClear}
        />
      </div>
      <div className="p-filters__pills">
        {applied.map((f) => (
          <FilterPill key={f.key} label={f.label} active onRemove={f.onRemove} />
        ))}
        {(filters || [])
          .filter((f) => !applied.some((a) => a.key === f.key))
          .map((f) => (
            <FilterPill key={f.key} label={f.label} onClick={f.onClick} />
          ))}
        <FilterPill label="Add filter" add onClick={onAddFilterClick} />
        {applied.length ? (
          <Button variant="plain" onClick={onClearAll}>
            Clear all
          </Button>
        ) : null}
      </div>
    </div>
  );
}
