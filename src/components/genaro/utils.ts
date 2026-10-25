/** Joins class names, skipping anything that is not a non-empty string (false, null, undefined, 0…). */
export function cx(...values: Array<string | number | bigint | boolean | null | undefined>): string {
  let out = '';
  for (const value of values) {
    if (typeof value === 'string' && value) out = out ? `${out} ${value}` : value;
  }
  return out;
}
