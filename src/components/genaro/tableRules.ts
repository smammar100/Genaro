/*
 * Table filter and sort rules, after tablecn's advanced toolbar (2026-11-07):
 * each filterable column declares a variant (text, number, date, select,
 * boolean); the variant decides the conditions it offers and the value it
 * takes. Rules join with "and" or "or"; sorting is an ordered list of
 * columns. Pure functions, so a page can filter rows it already holds and a
 * server query can reuse the same rules. TableFilterMenu and TableSortMenu
 * edit these shapes.
 */

export type TableFilterVariant = 'text' | 'number' | 'date' | 'select' | 'boolean';

export type TableFilterOperator =
  | 'contains'
  | 'notContains'
  | 'is'
  | 'isNot'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'between'
  | 'anyOf'
  | 'noneOf'
  | 'empty'
  | 'notEmpty';

export type TableJoin = 'and' | 'or';

export interface TableFilterOption {
  value: string;
  label: string;
  /** Rows holding this value, shown beside it in the picker. */
  count?: number;
}

export interface TableFilterField {
  /** The column (or derived value) the rule reads. */
  id: string;
  label: string;
  variant: TableFilterVariant;
  /** The choices of a `select` field. */
  options?: TableFilterOption[];
  /** The value box's placeholder. */
  placeholder?: string;
}

export interface TableFilterRule {
  /** Stable while the rule is edited, for React keys and focus. */
  id: string;
  field: string;
  operator: TableFilterOperator;
  /** One value; a [from, to] pair for `between`; the picked values for `anyOf` / `noneOf`. */
  value: string | string[];
}

export interface TableSortRule {
  field: string;
  desc: boolean;
}

export interface TableOperatorOption {
  value: TableFilterOperator;
  label: string;
}

const EMPTY_OPS: TableOperatorOption[] = [
  { value: 'empty', label: 'Is empty' },
  { value: 'notEmpty', label: 'Is not empty' },
];

/**
 * The conditions each variant offers, in the order the operator list shows
 * them; the first is the default for a new rule. Numbers read in words ("Is
 * at least 50000"): "≥" made people stop (call 2026-10-31).
 */
export const TABLE_FILTER_OPERATORS: Record<TableFilterVariant, TableOperatorOption[]> = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'notContains', label: 'Does not contain' },
    { value: 'is', label: 'Is' },
    { value: 'isNot', label: 'Is not' },
    ...EMPTY_OPS,
  ],
  number: [
    { value: 'is', label: 'Is' },
    { value: 'isNot', label: 'Is not' },
    { value: 'gte', label: 'Is at least' },
    { value: 'lte', label: 'Is at most' },
    { value: 'gt', label: 'Is more than' },
    { value: 'lt', label: 'Is less than' },
    { value: 'between', label: 'Is between' },
    ...EMPTY_OPS,
  ],
  date: [
    { value: 'is', label: 'Is' },
    { value: 'isNot', label: 'Is not' },
    { value: 'lt', label: 'Is before' },
    { value: 'gt', label: 'Is after' },
    { value: 'lte', label: 'Is on or before' },
    { value: 'gte', label: 'Is on or after' },
    { value: 'between', label: 'Is between' },
    ...EMPTY_OPS,
  ],
  select: [
    { value: 'anyOf', label: 'Is any of' },
    { value: 'noneOf', label: 'Is none of' },
    ...EMPTY_OPS,
  ],
  boolean: [{ value: 'is', label: 'Is' }],
};

export const TABLE_JOINS: { value: TableJoin; label: string }[] = [
  { value: 'and', label: 'and' },
  { value: 'or', label: 'or' },
];

let ruleSeq = 0;
/** A fresh rule id. */
export function tableRuleId(): string {
  ruleSeq += 1;
  return `r${ruleSeq.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** The value a rule starts with for an operator. */
export function emptyRuleValue(variant: TableFilterVariant, operator: TableFilterOperator): string | string[] {
  if (operator === 'between') return ['', ''];
  if (operator === 'anyOf' || operator === 'noneOf') return [];
  if (variant === 'boolean') return 'true';
  return '';
}

/** A new rule on a field, with its variant's first condition. */
export function defaultTableRule(field: TableFilterField, id = tableRuleId()): TableFilterRule {
  const operator = TABLE_FILTER_OPERATORS[field.variant][0].value;
  return { id, field: field.id, operator, value: emptyRuleValue(field.variant, operator) };
}

/**
 * The rule after a new operator: the value carries over while its shape
 * fits (a typed word stays when "Contains" becomes "Is"); otherwise it starts
 * empty.
 */
export function withTableOperator(rule: TableFilterRule, variant: TableFilterVariant, operator: TableFilterOperator): TableFilterRule {
  const next = emptyRuleValue(variant, operator);
  const fits = Array.isArray(next) === Array.isArray(rule.value) && (!Array.isArray(next) || next.length === 0 || (rule.value as string[]).length === next.length);
  const keep = fits && operator !== 'empty' && operator !== 'notEmpty';
  return { ...rule, operator, value: keep ? rule.value : next };
}

const isBlank = (s: unknown) => typeof s !== 'string' || s.trim() === '';

/** Whether a rule narrows anything yet: a rule still waiting for its value is left out. */
export function isTableRuleActive(rule: TableFilterRule, field?: TableFilterField): boolean {
  if (rule.operator === 'empty' || rule.operator === 'notEmpty') return true;
  const v = rule.value;
  if (Array.isArray(v)) {
    if (rule.operator === 'between') return v.some((x) => !isBlank(x) && (field?.variant !== 'number' || !Number.isNaN(Number(x))));
    return v.length > 0;
  }
  if (isBlank(v)) return false;
  return field?.variant !== 'number' || !Number.isNaN(Number(v));
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'number') return Number.isNaN(value);
  return false;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

/** A day as YYYY-MM-DD (local), from a Date, a date string or an ISO timestamp. */
function toDay(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${m}-${d}`;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return null;
}

function compareWith(op: TableFilterOperator, a: number | string, b: number | string): boolean {
  switch (op) {
    case 'is':
      return a === b;
    case 'isNot':
      return a !== b;
    case 'lt':
      return a < b;
    case 'lte':
      return a <= b;
    case 'gt':
      return a > b;
    case 'gte':
      return a >= b;
    default:
      return true;
  }
}

/** Whether one cell value passes one (active) rule. */
export function matchesTableRule(value: unknown, rule: TableFilterRule, variant: TableFilterVariant): boolean {
  if (rule.operator === 'empty') return isEmptyValue(value);
  if (rule.operator === 'notEmpty') return !isEmptyValue(value);

  if (variant === 'number' || variant === 'date') {
    const read = variant === 'number' ? (x: unknown) => toNumber(x) : (x: unknown) => toDay(x);
    const cell = read(value);
    const missing = cell === null || (typeof cell === 'number' && Number.isNaN(cell));
    if (rule.operator === 'between') {
      const [from, to] = (rule.value as string[]).map((x) => (isBlank(x) ? null : read(x)));
      if (missing) return false;
      const okFrom = from === null || (typeof from === 'number' && Number.isNaN(from)) || (cell as number | string) >= from;
      const okTo = to === null || (typeof to === 'number' && Number.isNaN(to)) || (cell as number | string) <= to;
      return okFrom && okTo;
    }
    const target = read(rule.value);
    if (target === null || (typeof target === 'number' && Number.isNaN(target))) return true;
    // A blank cell "is not" anything; it can't satisfy a comparison.
    if (missing) return rule.operator === 'isNot';
    return compareWith(rule.operator, cell as number | string, target);
  }

  if (variant === 'select') {
    const picked = rule.value as string[];
    const cell = value === null || value === undefined ? '' : String(value);
    const hit = picked.includes(cell);
    return rule.operator === 'noneOf' ? !hit : hit;
  }

  if (variant === 'boolean') {
    return Boolean(value) === (rule.value === 'true');
  }

  const cell = value === null || value === undefined ? '' : String(value).toLowerCase();
  const target = String(rule.value).trim().toLowerCase();
  switch (rule.operator) {
    case 'contains':
      return cell.includes(target);
    case 'notContains':
      return !cell.includes(target);
    case 'is':
      return cell === target;
    case 'isNot':
      return cell !== target;
    default:
      return true;
  }
}

/**
 * Rows that pass the rules: all of them ("and") or any of them ("or").
 * Rules on unknown fields and rules still waiting for a value are left out.
 */
export function applyTableFilters<T>(
  rows: T[],
  rules: TableFilterRule[],
  join: TableJoin,
  fields: TableFilterField[],
  get: (row: T, field: string) => unknown,
): T[] {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const active = rules.flatMap((rule) => {
    const field = byId.get(rule.field);
    return field && isTableRuleActive(rule, field) ? [{ rule, variant: field.variant }] : [];
  });
  if (active.length === 0) return rows;
  const test = (row: T, a: (typeof active)[number]) => matchesTableRule(get(row, a.rule.field), a.rule, a.variant);
  return rows.filter((row) => (join === 'or' ? active.some((a) => test(row, a)) : active.every((a) => test(row, a))));
}

const collator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });

function compareCells(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return collator.compare(String(a), String(b));
}

/**
 * Rows in the sort rules' order: the first rule first, ties broken by the
 * next. Blank cells go last in either direction, so "Descending" doesn't open
 * on a page of empties.
 */
export function applyTableSort<T>(rows: T[], sorting: TableSortRule[], get: (row: T, field: string) => unknown): T[] {
  if (sorting.length === 0) return rows;
  return [...rows].sort((x, y) => {
    for (const s of sorting) {
      const a = get(x, s.field);
      const b = get(y, s.field);
      const ea = isEmptyValue(a);
      const eb = isEmptyValue(b);
      if (ea || eb) {
        if (ea && eb) continue;
        return ea ? 1 : -1;
      }
      const c = compareCells(a, b);
      if (c !== 0) return s.desc ? -c : c;
    }
    return 0;
  });
}

/** Each value's row count, for a select field's picker. */
export function countTableValues<T>(rows: T[], read: (row: T) => unknown): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = read(row);
    if (isEmptyValue(v)) continue;
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
