/**
 * Compares the values the app saves with the lists of values the database
 * allows (bug list 2026-11-06). CarGurus leads failed because the app saved
 * 'cargurus' into leads.source, and that column's check didn't allow it.
 * Nothing compared the two, so it only showed up when staff hit it.
 *
 * Pure functions, unit-tested in src/lib/db-values.test.ts.
 * scripts/check-db-values.mjs runs them against the live database before each
 * build.
 */

/**
 * The app type in src/lib/types.ts that holds the values each column can be
 * given, keyed "table.column". A column with an allowed-values check that
 * isn't here is reported as not checked. Add it when you add a check.
 */
export const COLUMN_TYPES = {
  "activity_log.action_type": "ActivityActionType",
  "appointments.appointment_type": "AppointmentType",
  "appointments.outcome": "AppointmentOutcome",
  "appointments.status": "AppointmentStatus",
  "daily_jobs.priority": "DailyJobPriority",
  "daily_jobs.status": "DailyJobStatus",
  "enquiries.lost_reason": "LostReason",
  "enquiries.status": "EnquiryStatus",
  "external_invoices.invoice_kind": "InvoiceKind",
  "invoice_line_items.addon_type": "AddonCategory",
  "invoice_line_items.item_type": "InvoiceLineItemType",
  "invoice_line_items.line_type": "InvoiceLineType",
  "invoice_payments.deposit_method": "DepositMethod",
  "invoice_receipts.method": "DepositMethod",
  "invoices.status": "InvoiceStatus",
  "invoices.type": "InvoiceType",
  "invoices.vat_scheme": "VatScheme",
  "leads.lead_type": "LeadType",
  "leads.source": "LeadSource",
  "leads.status": "LeadStatus",
  "listings.status": "ListingStatus",
  "maintenance_job_notes.note_type": "JobNoteType",
  "maintenance_jobs.status": "MaintenanceStatus",
  "notifications.type": "NotificationType",
  "pipeline_stages.behaviour": "StageBehaviour",
  "todo_items.source": "TodoSource",
  "todo_items.status": "TodoStatus",
  "users.role": "UserRole",
  "vehicle_returns.reason_code": "ReturnReason",
  "vehicle_returns.resolution_path": "ReturnResolutionPath",
  "vehicle_returns.status": "ReturnStatus",
  "vehicles.body_type": "BodyType",
  "vehicles.finance_provider": "FinanceProvider",
  "vehicles.fuel_type": "FuelType",
  "vehicles.purchase_channel": "PurchaseChannel",
  "vehicles.purchase_source": "PurchaseSource",
  "vehicles.sale_status": "SaleStatus",
  "vehicles.service_history": "ServiceHistory",
  "vehicles.status": "VehicleStatus",
  "vehicles.transmission": "Transmission",
  "vehicles.vehicle_type": "VehicleType",
  "vendors.speciality": "VendorSpeciality",
  "warranties.purchase_status": "WarrantyPurchaseStatus",
  "warranties.status": "WarrantyStatus",
  "warranties.type": "WarrantyType",
  "warranty_claims.status": "ClaimStatus",
  "workshop_jobs.status": "MaintenanceStatus",
};

/**
 * The column and allowed values of a check Postgres prints as
 * `CHECK ((col = ANY (ARRAY['a'::text, 'b'::text])))`, including the
 * `col IS NULL OR …` and varchar-cast forms. Null for any other kind of check.
 * @param {string} definition
 * @returns {{ column: string, values: string[] } | null}
 */
export function parseAllowedValues(definition) {
  const m = definition.match(/\(?(\w+)\)?(?:::[\w ]+)? = ANY \(\(?ARRAY\[(.*?)\]/);
  if (!m) return null;
  const values = [...m[2].matchAll(/'((?:[^']|'')*)'/g)].map((v) => v[1].replace(/''/g, "'"));
  return values.length ? { column: m[1], values } : null;
}

/**
 * The string values of `export type Name = "a" | "b" | Other;` in a types
 * file, following other types it names. Null when the type isn't there.
 * @param {string} source
 * @param {string} name
 * @param {Set<string>} [seen]
 * @returns {string[] | null}
 */
export function unionValues(source, name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const m = source.match(new RegExp(`export type ${name}\\s*=([^;]*);`));
  if (!m) return null;
  const body = m[1];
  const values = [...body.matchAll(/"([^"]+)"/g)].map((v) => v[1]);
  for (const ref of body.replace(/"[^"]*"/g, "").match(/\b[A-Z]\w*\b/g) ?? []) {
    values.push(...(unionValues(source, ref, seen) ?? []));
  }
  return [...new Set(values)];
}

/**
 * Every `actionType: "…"` the code logs, so an action logged without being
 * added to ActivityActionType is caught too.
 * @param {string[]} sources
 * @returns {string[]}
 */
export function loggedActionTypes(sources) {
  const out = new Set();
  for (const s of sources) {
    for (const m of s.matchAll(/actionType:\s*["']([a-z_]+)["']/g)) out.add(m[1]);
  }
  return [...out];
}

/**
 * @typedef {{ table_name: string, constraint_name: string, definition: string }} DbCheck
 * @typedef {{ column: string, constraint: string, refused: string[], allowed: string[] }} Refusal
 */

/**
 * Compares each allowed-values check with the values the app can save.
 * `refused`: values the app can save that the database would reject, which
 * fails the release. `unchecked`: columns with a check but no app type mapped
 * to them. `missingTypes`: mapped types that couldn't be read.
 * @param {DbCheck[]} checks
 * @param {string} typesSource contents of src/lib/types.ts
 * @param {string[]} [extraActionTypes] action types found logged in code
 * @returns {{ refused: Refusal[], unchecked: string[], missingTypes: string[], checked: number }}
 */
export function compareWithDatabase(checks, typesSource, extraActionTypes = []) {
  const refused = [];
  const unchecked = [];
  const missingTypes = [];
  let checked = 0;
  for (const check of checks) {
    const parsed = parseAllowedValues(check.definition);
    if (!parsed) continue;
    const column = `${check.table_name}.${parsed.column}`;
    const typeName = COLUMN_TYPES[column];
    if (!typeName) {
      unchecked.push(column);
      continue;
    }
    const appValues = unionValues(typesSource, typeName);
    if (!appValues) {
      missingTypes.push(`${column} (${typeName})`);
      continue;
    }
    if (column === "activity_log.action_type") appValues.push(...extraActionTypes);
    checked += 1;
    const allowed = new Set(parsed.values);
    const bad = [...new Set(appValues)].filter((v) => !allowed.has(v));
    if (bad.length) refused.push({ column, constraint: check.constraint_name, refused: bad, allowed: parsed.values });
  }
  return { refused, unchecked, missingTypes, checked };
}
