/**
 * Seed the rest of the DEMO dataset around the demo cars, so every screen has
 * something in it: vendors, dealer partners, maintenance jobs + notes,
 * inspections, leads, appointments, open pipeline deals + deal notes,
 * listings, warranties + claims, sales invoices (line items, payments,
 * receipts), external invoices, returns, location moves, walk-in workshop
 * jobs, notifications and ~45 activity-log entries.
 *
 *   node scripts/seed-demo-vehicles.mts --company <uuid> --user <uuid>   # first
 *   node scripts/seed-demo-extra.mts    --company <uuid> --user <uuid>
 *
 * --user is the owner/super user; other active staff in the company are
 * rotated in as assignees. Needs NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY in .env.local.
 *
 * IDEMPOTENT: every row gets a fixed id `de300000-<table>-4000-8000-<n>` and
 * is upserted with ignoreDuplicates, so a re-run inserts nothing new (and a
 * half-finished run completes). Updates only touch demo rows: D- cars and the
 * deals the vehicle seed created.
 *
 * Fake-by-construction: customers have made-up surnames (Mockford, Testwell…),
 * emails are @example.com, mobiles are Ofcom's drama range 07700 900xxx and
 * landlines 020 7946 0xxx.
 *
 * REMOVING IT ALL (SQL editor, children first):
 *   delete from <t> where id::text like 'de300000-%';   -- for each table below:
 *     activity_log, notifications, deal_notes, invoice_receipts,
 *     invoice_payments, invoice_line_items, warranty_claims, vehicle_returns,
 *     warranties, invoices, external_invoices, location_movements,
 *     maintenance_job_notes, maintenance_jobs, inspection_notes,
 *     inspection_checks, listings, workshop_jobs, sales_deals, appointments,
 *     leads, dealer_partners, vendors
 *   (leads/appointments/invoices also carry is_demo = true.) Then the vehicle
 *   seed's rows: sales_deals / todo_items / activity_log where vehicle_id is a
 *   D- car, then `delete from vehicles where is_demo and stock_id like 'D-%'`.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const COMPANY = arg("company");
const OWNER = arg("user");
if (!COMPANY || !OWNER) {
  console.error("Usage: node scripts/seed-demo-extra.mts --company <uuid> --user <uuid>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── helpers ──────────────────────────────────────────────────────────────
const T = {
  vendors: 1, dealer_partners: 2, maintenance_jobs: 3, maintenance_job_notes: 4,
  inspection_checks: 5, inspection_notes: 6, leads: 7, appointments: 8, sales_deals: 9,
  deal_notes: 10, warranties: 11, warranty_claims: 12, invoices: 13, invoice_line_items: 14,
  invoice_payments: 15, invoice_receipts: 16, external_invoices: 17, vehicle_returns: 18,
  location_movements: 19, activity_log: 20, notifications: 21, listings: 22, workshop_jobs: 23,
} as const;
const id = (t: keyof typeof T, n: number) =>
  `de300000-${String(T[t]).padStart(4, "0")}-4000-8000-${String(n).padStart(12, "0")}`;

const NOW = Date.now();
const H = 3_600_000;
const D = 24 * H;
/** ISO timestamp `h` hours ago (negative = in the future). */
const hAgo = (h: number) => new Date(NOW - h * H).toISOString();
/** Local-calendar YYYY-MM-DD `d` days ago (negative = in the future). */
const dAgo = (d: number) => {
  const t = new Date(NOW - d * D);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + n * D).toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;
const phone = (n: number) => `07700 900${String(n).padStart(3, "0")}`;
const email = (name: string) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

const counts: Record<string, number> = {};
async function put(table: keyof typeof T, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const { data, error } = await db
    .from(table)
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true, defaultToNull: false })
    .select("id");
  if (error) throw new Error(`${table}: ${error.message} ${error.details ?? ""} ${error.hint ?? ""}`);
  counts[table] = (counts[table] ?? 0) + (data?.length ?? 0);
}

// ─── context: demo cars, deals, users, config ─────────────────────────────
const { data: cars, error: carErr } = await db
  .from("vehicles")
  .select("id, stock_id, registration, make, model, variant_name, year, mileage, status, listing_price, selling_price, date_sold, received_date, buying_price, buyers_fee, base_cost, num_keys, lock_nut")
  .eq("company_id", COMPANY).eq("is_demo", true).like("stock_id", "D-%").order("stock_id");
if (carErr) throw carErr;
if (!cars?.length) {
  console.error("No demo cars (D-…) found — run scripts/seed-demo-vehicles.mts first.");
  process.exit(1);
}
type Car = (typeof cars)[number];
const V = new Map<string, Car>(cars.map((c) => [c.stock_id as string, c]));
const car = (stock: string) => {
  const c = V.get(stock);
  if (!c) throw new Error(`Demo car ${stock} missing — re-run the vehicle seed.`);
  return c;
};
const label = (c: Car) => `${c.make} ${c.model} (${c.registration})`;

const { data: seedDeals, error: dealErr } = await db
  .from("sales_deals")
  .select("id, vehicle_id, customer_name, customer_phone, customer_email, stage, agreed_price, deposit_amount")
  .in("vehicle_id", cars.map((c) => c.id));
if (dealErr) throw dealErr;
const dealFor = (c: Car) => seedDeals!.find((d) => d.vehicle_id === c.id && !d.id.startsWith("de300000-"));

const { data: staff } = await db
  .from("users").select("id").eq("company_id", COMPANY).eq("active", true).neq("id", OWNER)
  .order("created_at");
const others = (staff ?? []).map((u) => u.id as string);
const U = [OWNER, ...others];
const user = (i: number) => U[i % U.length];

const { data: channels } = await db.from("lead_channels").select("id, slug").eq("company_id", COMPANY);
const channel = (slug: string) => channels?.find((c) => c.slug === slug)?.id ?? null;
const { data: checklist } = await db
  .from("inspection_checklist_items").select("number, item, status_options")
  .eq("company_id", COMPANY).order("sort_order");

// Idempotency short-circuit: the last row this script writes is the final
// activity entry — if it's there, everything before it is too.
const LAST_ACTIVITY = 60;
const { data: done } = await db.from("activity_log").select("id").eq("id", id("activity_log", LAST_ACTIVITY)).maybeSingle();
if (done) {
  console.log("Extra demo data (de300000-…) already seeded — nothing to do.");
  process.exit(0);
}

// ─── vendors & dealer partners ────────────────────────────────────────────
const VENDORS = [
  ["Westway Auto Mechanics", "mechanical"], ["Northfields Bodyworks", "bodywork"],
  ["Greenford Tyre Centre", "tyres"], ["Ealing Broadway MOT Centre", "mot"],
  ["Park Royal Auto Electrics", "electrical"], ["Hayes Smart Repair & Valet", "general"],
  ["Brentford Car Auctions", "general"],
] as const;
await put("vendors", VENDORS.map(([name, speciality], i) => ({
  id: id("vendors", i + 1), company_id: COMPANY, name, speciality, active: true,
  phone: `020 7946 0${String(101 + i)}`, created_at: hAgo(900 - i * 10), updated_at: hAgo(900 - i * 10),
})));
const vendor = (n: number) => id("vendors", n);

await put("dealer_partners", [
  ["Imran Mockford", "Mockford Motors Ltd", "Unit 4, Example Trading Estate, Hayes UB3 1AA", "GB000000101", "Supplies ex-fleet Toyota hybrids, usually 3–5 a month."],
  ["Daniel Testwell", "Testwell Trade Cars", "12 Sample Street, Hounslow TW3 1AA", "GB000000102", "Part-exchange overflow. Pays on collection."],
  ["Sara Sampleton", "Sampleton Autos", "88 Demo Road, Southall UB1 1AA", null, "Japanese imports (Alphard / Serena)."],
  ["Mark Dummett", "Dummett Fleet Disposals", "3 Placeholder Park, Slough SL1 1AA", "GB000000104", "Paused — waiting on new terms."],
].map(([name, company_name, company_address, vat_number, notes], i) => ({
  id: id("dealer_partners", i + 1), company_id: COMPANY, name, company_name, company_address,
  vat_number, notes, phone: phone(101 + i), email: email(name as string), active: i !== 3,
  created_at: hAgo(800 - i * 24), updated_at: hAgo(800 - i * 24),
})));

// ─── inspections (5 cars × every checklist point) ─────────────────────────
// Flagged points per car; everything else passes with the first option.
const FLAGS: Record<string, Record<number, [string, string | null]>> = {
  "D-0007": { 5: ["Replace", "Front pair below 2mm"], 2: ["Fair", "Needs Service"], 6: ["Space Saver", null] },
  "D-0013": { 4: ["Minor Damage", "Rear bumper scuff"], 8: ["Low", "Replace key battery"] },
  "D-0017": { 18: ["Weak", "Needs Recharge"], 10: ["Active", "TPMS Light On"] },
  "D-0021": { 1: ["Expiring Soon", "MOT due within 30 days"], 9: ["Needs Replacing", "Battery failed drop test"] },
  "D-0002": { 2: ["Fair", "Needs Service"] },
};
const INSPECTED: [string, number, number][] = [ // stock, days ago, inspector index
  ["D-0007", 8, 1], ["D-0013", 6, 2], ["D-0017", 9, 0], ["D-0021", 5, 1], ["D-0002", 20, 0],
];
const checks: Record<string, unknown>[] = [];
let ci = 0;
for (const [stock, ago, who] of INSPECTED) {
  const c = car(stock);
  for (const item of checklist ?? []) {
    const flag = FLAGS[stock][item.number as number];
    const opts = item.status_options as string[];
    checks.push({
      id: id("inspection_checks", ++ci), vehicle_id: c.id, check_number: item.number,
      check_item: item.item, status: flag ? flag[0] : opts[0], action_required: flag ? flag[1] : null,
      carried_out_by: user(who), carried_out_date: dAgo(ago), created_at: hAgo(ago * 24),
    });
  }
}
await put("inspection_checks", checks);
await put("inspection_notes", [
  ["D-0007", "Drives well. Tyres need doing before it goes out.", 8, 1],
  ["D-0013", "Scuff on the rear bumper only, panels straight.", 6, 2],
  ["D-0017", "Aircon blowing warm; TPMS light on the dash.", 9, 0],
  ["D-0021", "Battery weak on cold start. MOT next month.", 5, 1],
  ["D-0002", "Clean car, service and it's ready to advertise.", 20, 0],
].map(([stock, content, ago, who], i) => ({
  id: id("inspection_notes", i + 1), vehicle_id: car(stock as string).id, user_id: user(who as number),
  content, created_at: hAgo((ago as number) * 24 - 1),
})));

// ─── maintenance jobs + notes ─────────────────────────────────────────────
type Job = [string, string, number | null, string, number | null, number | null, number | null, number | null, number | null, string | null, string | null, number];
// stock, description, vendor#, status, est, actual, start(dAgo), due(dAgo), completed(dAgo), time, notes, assignee
const JOBS: Job[] = [
  ["D-0007", "Full service + oil & filter", 1, "in_progress", 180, null, 2, -1, null, "09:30", null, 1],
  ["D-0007", "Tyres Condition: Replace (front pair)", 3, "pending", 160, null, null, -2, null, null, "Auto-created from 20-point inspection (item #5)", 1],
  ["D-0013", "General Body Work: Minor Damage (rear bumper scuff)", 2, "in_progress", 220, null, 3, -2, null, null, "Auto-created from 20-point inspection (item #4)", 2],
  ["D-0013", "Key Battery: Low", null, "pending", 8, null, null, 0, null, null, "Auto-created from 20-point inspection (item #8)", 2],
  ["D-0017", "AirCon Working: Needs Recharge", 5, "completed", 85, 90, 6, 4, 4, null, "Auto-created from 20-point inspection (item #18)", 0],
  ["D-0017", "Warning Lights: TPMS Light On", 5, "stalled", 60, null, 5, 1, null, null, "Waiting on a replacement sensor (ETA next week)", 0],
  ["D-0021", "MOT + advisories", 4, "pending", 54.85, null, null, -3, null, "14:00", null, 1],
  ["D-0021", "Ignition / Battery: Needs New Battery", 1, "in_progress", 120, null, 1, -1, null, null, "Auto-created from 20-point inspection (item #9)", 1],
  ["D-0014", "Valet & machine polish before photos", 6, "completed", 90, 95, 5, 2, 2, null, null, 3],
  ["D-0020", "Alloy wheel refurbishment (x2)", 6, "in_progress", 140, null, 0, -1, null, "11:00", null, 3],
  ["D-0002", "Oil Condition: Needs Service", 1, "completed", 150, 150, 12, 8, 8, null, "Auto-created from 20-point inspection (item #2)", 0],
  ["D-0005", "Replace front brake pads & discs", 1, "completed", 210, 198, 7, 5, 5, "10:00", null, 2],
];
await put("maintenance_jobs", JOBS.map(([stock, description, v, status, est, actual, start, due, completed, time, notes, who], i) => {
  const created = Math.max(start ?? 0, 1) + 1;
  return {
    id: id("maintenance_jobs", i + 1), company_id: COMPANY, vehicle_id: car(stock).id, description,
    vendor_id: v ? vendor(v) : null, assigned_to: user(who), status, estimated_cost: est, actual_cost: actual,
    estimated_duration_hours: est && est > 100 ? 4 : 1, start_date: start == null ? null : dAgo(start),
    due_date: due == null ? null : dAgo(due), completed_date: completed == null ? null : dAgo(completed),
    scheduled_time: time, notes, created_at: hAgo(created * 24), updated_at: hAgo((completed ?? start ?? created) * 24),
  };
}));
await put("maintenance_job_notes", [
  [1, "status_update", "Status changed: pending → in_progress", 48, 1],
  [1, "vendor_update", "Westway confirmed the car will be ready by Friday.", 20, 1],
  [3, "call_log", "Called Northfields: paint matched, respray booked for tomorrow.", 30, 2],
  [5, "status_update", "Status changed: in_progress → completed", 96, 0],
  [6, "note", "Sensor is on back-order from the supplier.", 70, 0],
  [6, "status_update", "Status changed: in_progress → stalled", 69, 0],
  [8, "status_update", "Status changed: pending → in_progress", 22, 1],
  [12, "note", "Discs were under minimum thickness; pads and discs replaced both sides.", 120, 2],
].map(([job, note_type, content, ago, who], i) => ({
  id: id("maintenance_job_notes", i + 1), job_id: id("maintenance_jobs", job as number),
  user_id: user(who as number), note_type, content, created_at: hAgo(ago as number),
})));

// ─── leads, appointments, open pipeline deals ─────────────────────────────
const SOURCE: Record<string, string> = { repeat_customer: "other", instagram: "other" };
type Lead = [string, string, string | null, string, number, string | null, string | null];
// name, channel slug, stock (null = general interest), status, hours ago, lost reason, notes
const LEADS: Lead[] = [
  ["Aaron Mockford", "autotrader", "D-0024", "new", 4, null, "Asked if the price is negotiable."],
  ["Bella Testwell", "website", "D-0009", "new", 50, null, null],
  ["Chris Fakenham", "facebook", "D-0011", "new", 8, null, "Wants finance options."],
  ["Dina Sampleton", "phone", null, "new", 30, null, "Looking for any 7-seater hybrid under £15k."],
  ["Ethan Dummett", "walk_in", "D-0001", "contacted", 72, null, "Came in Saturday, will call back after payday."],
  ["Farah Demoley", "ebay", "D-0028", "contacted", 96, null, null],
  ["George Placeford", "referral", "D-0023", "contacted", 60, null, "Referred by a previous customer."],
  ["Hina Mockford", "autotrader", "D-0010", "appointment_booked", 40, null, "Test drive booked."],
  ["Isaac Testwell", "website", "D-0037", "appointment_booked", 55, null, "Has a part-exchange (2014 Honda Civic)."],
  ["Jade Fakenham", "repeat_customer", "D-0029", "appointment_booked", 34, null, "Bought a Prius from us last year."],
  ["Kamal Sampleton", "autotrader", "D-0008", "lost", 140, "Bought elsewhere (cheaper)", null],
  ["Lucy Dummett", "facebook", "D-0023", "lost", 180, "Finance declined", null],
];
await put("leads", LEADS.map(([name, slug, stock, status, ago, lost_reason, notes], i) => {
  const c = stock ? car(stock) : null;
  return {
    id: id("leads", i + 1), company_id: COMPANY, customer_name: name, customer_phone: phone(201 + i),
    customer_email: email(name), vehicle_id: c?.id ?? null,
    vehicle_interest: c ? label(c) : notes ?? "General enquiry",
    source: SOURCE[slug] ?? slug, lead_channel_id: channel(slug), status, lost_reason,
    assigned_to: user(i), notes, is_demo: true, created_at: hAgo(ago), updated_at: hAgo(Math.max(ago - 6, 1)),
  };
}));

const reserved = ["D-0003", "D-0034"].map((s) => [s, dealFor(car(s))] as const);
type Appt = [number | null, string, string, number, string, string, string, number];
// lead#, name, stock, days ahead(+)/ago(-), time, status, outcome, hours-ago created
const APPTS: Appt[] = [
  [8, "Hina Mockford", "D-0010", 1, "11:00", "upcoming", "pending", 28],
  [9, "Isaac Testwell", "D-0037", 2, "14:30", "upcoming", "pending", 50],
  [10, "Jade Fakenham", "D-0029", 4, "10:00", "upcoming", "pending", 30],
  [null, "Omar Placeford", "D-0024", 0, "16:00", "upcoming", "pending", 3],
  [null, "Priya Demoley", "D-0001", 6, "12:00", "upcoming", "pending", 20],
  [null, reserved[0][1]?.customer_name ?? "Nadia Mockford", "D-0003", -5, "13:00", "completed", "deposit_taken", 170],
  [null, reserved[1][1]?.customer_name ?? "Ryan Testwell", "D-0034", -1, "15:30", "completed", "test_drive", 60],
  [null, "Quentin Fakenham", "D-0011", -2, "10:30", "no_show", "pending", 80],
];
await put("appointments", APPTS.map(([lead, name, stock, ahead, time, status, outcome, created], i) => ({
  id: id("appointments", i + 1), company_id: COMPANY, vehicle_id: car(stock).id,
  lead_id: lead ? id("leads", lead) : null, customer_name: name, customer_phone: phone(301 + i),
  customer_email: email(name), date: dAgo(-ahead), time, status, outcome,
  special_requirements: i === 1 ? "Bringing part-exchange for valuation" : null,
  notifications_sent: { email: false, whatsapp: false }, created_by: user(i),
  is_demo: true, created_at: hAgo(created), updated_at: hAgo(Math.max(created - 2, 1)),
})));
for (const [lead, appt] of [[8, 1], [9, 2], [10, 3]]) {
  const { error } = await db.from("leads").update({ appointment_id: id("appointments", appt) })
    .eq("id", id("leads", lead)).eq("is_demo", true);
  if (error) throw error;
}

type Deal = [number, string, string, number | null, number];
// lead#, stock, stage, offer, hours ago
const DEALS: Deal[] = [
  [1, "D-0024", "new_lead", null, 3],
  [5, "D-0001", "contacted", null, 30],
  [6, "D-0028", "contacted", null, 90],
  [8, "D-0010", "test_drive", null, 26],
  [9, "D-0037", "test_drive", 6400, 48],
  [11, "D-0008", "lost", 12500, 140],
];
await put("sales_deals", DEALS.map(([lead, stock, stage, offer, ago], i) => {
  const L = LEADS[lead - 1];
  return {
    id: id("sales_deals", i + 1), company_id: COMPANY, vehicle_id: car(stock).id, lead_id: id("leads", lead),
    customer_name: L[0], customer_phone: phone(200 + lead), customer_email: email(L[0]), stage,
    offer_price: offer, selling_agent: user(i), notes: stage === "lost" ? L[5] : null,
    created_at: hAgo(ago), updated_at: hAgo(Math.max(ago - 5, 1)),
  };
}));

// Tidy the vehicle seed's own deals: drama-range phones, example.com emails,
// and deposit details on the reserved ones so the pipeline cards read right.
for (const [i, d] of seedDeals!.entries()) {
  const patch: Record<string, unknown> = {};
  if (!String(d.customer_phone).startsWith("07700 900")) patch.customer_phone = phone(400 + i);
  if (!d.customer_email) patch.customer_email = email(d.customer_name as string);
  if (d.stage === "deposit_taken" && d.deposit_amount == null) {
    Object.assign(patch, { deposit_amount: i % 2 ? 1000 : 500, deposit_date: dAgo(3 + (i % 4)), collection_date: dAgo(-(2 + (i % 5))) });
  }
  if (Object.keys(patch).length) {
    const { error } = await db.from("sales_deals").update(patch).eq("id", d.id);
    if (error) throw error;
  }
}

await put("deal_notes", [
  [5, "Customer wants to part-exchange a 2014 Honda Civic; valuation at the viewing.", 47, 1],
  [4, "Test drive booked for tomorrow 11am. Bringing proof of address.", 22, 0],
  [null, "£500 deposit taken by card. Collection next week once the MOT is done.", 100, 2],
].map(([deal, content, ago, who], i) => ({
  id: id("deal_notes", i + 1), deal_id: deal ? id("sales_deals", deal as number) : reserved[0][1]!.id,
  user_id: user(who as number), content, created_at: hAgo(ago as number),
})));

// ─── listings (listed / reserved / sold cars) ─────────────────────────────
const INDICATORS = ["great", "good", "good", "above_average", "unrated"];
const listed = cars.filter((c) => ["listed", "reserved", "sold", "returned"].includes(c.status as string));
await put("listings", listed.map((c, i) => {
  const name = `${c.year} ${title(c.make as string)} ${title(c.model as string)} ${c.variant_name ?? ""}`.trim();
  const since = Math.max(1, Math.round((NOW - Date.parse(`${c.received_date}T12:00:00Z`)) / D) - 4);
  return {
    id: id("listings", i + 1), company_id: COMPANY, vehicle_id: c.id, title: name,
    description: `${name} in ${String(c.mileage).replace(/\B(?=(\d{3})+$)/g, ",")} miles. HPI clear, fresh service, ${c.num_keys ?? 2} keys. Part-exchange welcome, finance available. Demo listing.`,
    price: c.listing_price ?? c.selling_price ?? 0,
    special_features: "Bluetooth, Parking sensors, Cruise control, DAB radio",
    channels: { website: true, autotrader: true, ebay: i % 3 === 0, facebook: i % 2 === 0 },
    at_price_indicator: INDICATORS[i % INDICATORS.length],
    status: c.stock_id === "D-0040" ? "archived" : c.status === "listed" ? "live" : c.status,
    published_at: hAgo(since * 24), enquiries_count: (i * 7) % 15, advert_data: {},
    created_at: hAgo(since * 24 + 2), updated_at: hAgo(since * 24),
  };
}));

// ─── sales invoices for sold cars (+ lines, payments, receipts) ───────────
const SOLD = cars.filter((c) => c.date_sold != null).map((c) => c.stock_id as string);
const IN_HOUSE = (duration: string, cover = "Premier") => ({
  type: "in_house", provider: "Car Capital Ltd", providerPhone: "020 7946 0100", providerEmail: "warranty@example.com",
  coverType: cover, claimLimit: cover === "Premier" ? 2000 : 1000, diagnosticsCover: 60,
  duration, excessPercent: 10, wearTearCovered: false,
});
const EXTERNAL = (duration: string) => ({
  type: "external", provider: "SafeDrive Warranties", providerPhone: "020 7946 0199", providerEmail: "claims@example.com",
  coverType: "Comprehensive", claimLimit: 5000, diagnosticsCover: 100, duration, excessPercent: 0, wearTearCovered: true,
});
// Per sold car: discount, paid home delivery, deposit, method, finance?, status, warranty declaration
const INV_PLAN: Record<string, { disc: number; addon: number; dep: number; method: string; finance: boolean; status: string; w: object | null }> = {
  "D-0012": { disc: 0, addon: 150, dep: 500, method: "card", finance: false, status: "paid", w: IN_HOUSE("3 Months") },
  "D-0015": { disc: 200, addon: 0, dep: 1000, method: "bank_transfer", finance: false, status: "paid", w: IN_HOUSE("1 Month", "Standard") },
  "D-0019": { disc: 0, addon: 0, dep: 500, method: "cash", finance: false, status: "paid", w: IN_HOUSE("3 Months") },
  "D-0033": { disc: 100, addon: 150, dep: 500, method: "card", finance: false, status: "issued", w: EXTERNAL("6 Months") },
  "D-0036": { disc: 0, addon: 0, dep: 1000, method: "bank_transfer", finance: true, status: "issued", w: IN_HOUSE("6 Months") },
  "D-0039": { disc: 300, addon: 150, dep: 1000, method: "pdq", finance: false, status: "paid", w: IN_HOUSE("1 Month", "Standard") },
  "D-0040": { disc: 0, addon: 0, dep: 500, method: "bank_transfer", finance: false, status: "paid", w: IN_HOUSE("3 Months") },
};
const PDI = (c: Car, sold: string) => ({
  engineStarts: true, engineNoise: true, transmission: true, noiseNormal: true, clutch: true, steering: true,
  bodyCondition: true, bodySuspension: true, brakes: true, gauges: true, warningLights: true, exhaust: true,
  exteriorLights: true, serviceLight: true, lockNut: c.lock_nut ?? true, numKeys: c.num_keys ?? 2,
  serviceHistoryStatus: "Partial - Provided", engineServiceDoneDate: addDays(sold, -3), engineServiceDoneMileage: c.mileage,
  v5Status: "V5C-2 Green Slip", hpiCheckResult: "Clear",
});
const invoices: Record<string, unknown>[] = [];
const lines: Record<string, unknown>[] = [];
const payments: Record<string, unknown>[] = [];
const receipts: Record<string, unknown>[] = [];
const invoiceFor = new Map<string, { id: string; number: string; total: number; receipt: string | null; deal: string | null; customer: string; phone: string; email: string }>();
let li = 0;
for (const [n, stock] of SOLD.entries()) {
  const c = car(stock);
  const p = INV_PLAN[stock] ?? { disc: 0, addon: 0, dep: 500, method: "card", finance: false, status: "paid", w: IN_HOUSE("3 Months") };
  const deal = dealFor(c);
  const customer = (deal?.customer_name as string) ?? "Demo Customer";
  const cPhone = phone(400 + seedDeals!.indexOf(deal!));
  const cEmail = email(customer);
  const sold = (c.date_sold as string) ?? dAgo(7);
  const price = Number(c.selling_price ?? c.listing_price);
  const salesPrice = price + p.disc;
  const total = price + p.addon;
  const finance = p.finance ? total - p.dep - 500 : 0;
  const balance = total - p.dep - finance;
  const vatVehicle = round2(Math.max(0, salesPrice - Number(c.base_cost ?? 0)) / 6);
  const vat = round2(vatVehicle - p.disc / 6 + p.addon * 0.2);
  const invId = id("invoices", n + 1);
  const number = `D-INV-${String(n + 1).padStart(4, "0")}`;
  const issued = `${sold}T${String(11 + (n % 5)).padStart(2, "0")}:15:00.000Z`;
  invoices.push({
    id: invId, company_id: COMPANY, type: "sale", vehicle_id: c.id, invoice_number: number,
    party_name: customer, party_phone: cPhone, party_email: cEmail,
    buyer_name: customer, buyer_phone: cPhone, buyer_email: cEmail,
    buyer_address: `${10 + n * 7} Example Road, Southall`, buyer_postcode: "UB1 1AA",
    invoice_date: sold, due_date: null, vat_scheme: "margin_used",
    subtotal: total, addons_total: p.addon, discount_total: -p.disc, vat_amount: vat, total,
    status: p.status, notes: null, attachment_url: null, related_return_id: null, related_invoice_id: null,
    present_mileage: c.mileage, dor_date: `${c.year}-03-01`, sales_price: salesPrice, discount: p.disc,
    paid_addons_total: p.addon, grand_total_incl_addons: total,
    deposit_amount: p.dep, deposit_received_date: addDays(sold, -2), deposit_method: p.method,
    finance_amount: finance, finance_provider: p.finance ? "Northway Motor Finance (demo)" : null,
    balance_due: balance, balance_due_by: p.status === "paid" ? null : addDays(sold, 7),
    warranty: p.w, non_warranty_disclaimer_accepted: false, pre_delivery_check: PDI(c, sold),
    include_unit_stocking_note: true, include_id_requirement_note: true, include_service_history_note: true,
    custom_note: null, sale_id: null, created_by: user(n), issued_at: issued, is_demo: true,
    created_at: issued, updated_at: issued,
  });
  const base = { invoice_id: invId, quantity: 1, created_at: issued };
  lines.push({ ...base, id: id("invoice_line_items", ++li), line_type: "vehicle", item_type: "vehicle_price", addon_type: null, addon_category: null, description: "SALES PRICE", unit_price: salesPrice, vat_rate: 0, subtotal: salesPrice, vat_amount: vatVehicle, sort_order: 0 });
  let sort = 1;
  if (p.disc) lines.push({ ...base, id: id("invoice_line_items", ++li), line_type: "discount", item_type: "discount", addon_type: null, addon_category: null, description: "DISCOUNT", unit_price: p.disc, vat_rate: 0, subtotal: p.disc, vat_amount: -round2(p.disc / 6), sort_order: sort++ });
  if (p.w) {
    const w = p.w as { duration: string; type: string };
    lines.push({ ...base, id: id("invoice_line_items", ++li), line_type: "addon", item_type: "addon_free", addon_type: "warranty", addon_category: "warranty", description: `${w.duration.toUpperCase()} ${w.type === "external" ? "SAFEDRIVE" : "IN-HOUSE"} WARRANTY`, unit_price: 0, vat_rate: 0, subtotal: 0, vat_amount: 0, sort_order: sort++ });
  }
  if (p.addon) lines.push({ ...base, id: id("invoice_line_items", ++li), line_type: "addon", item_type: "addon_paid", addon_type: "home_delivery", addon_category: "home_delivery", description: "HOME DELIVERY", unit_price: p.addon, vat_rate: 0.2, subtotal: p.addon, vat_amount: round2(p.addon * 0.2), sort_order: sort++ });
  payments.push({ id: id("invoice_payments", n + 1), invoice_id: invId, deposit_amount: p.dep, deposit_method: p.method, finance_amount: finance, finance_provider: p.finance ? "Northway Motor Finance (demo)" : null, balance_due: balance, balance_due_by: p.status === "paid" ? null : addDays(sold, 7), created_at: issued });
  let receipt: string | null = null;
  if (p.status === "paid" && balance > 0) {
    receipt = id("invoice_receipts", n + 1);
    receipts.push({ id: receipt, invoice_id: invId, company_id: COMPANY, amount: balance, paid_on: sold, method: n % 2 ? "bank_transfer" : "cash", reference: n % 2 ? `DEMO-BT-${1000 + n}` : null, notes: null, recorded_by: user(n), created_at: issued });
  }
  invoiceFor.set(stock, { id: invId, number, total, receipt, deal: deal?.id ?? null, customer, phone: cPhone, email: cEmail });
}
await put("invoices", invoices);
await put("invoice_line_items", lines);
await put("invoice_payments", payments);
await put("invoice_receipts", receipts);

// ─── warranties + claims ──────────────────────────────────────────────────
type W = [string, "in_house" | "external", number, string, string, string | null, number, number, boolean];
// stock, type, months, status, cover label, purchase status, cost to dealer, cost to customer, linked to invoice
const WARRANTIES: W[] = [
  ["D-0012", "in_house", 3, "active", "Premier cover · 3 Months · £2,000 claim limit · £60 diagnostics · 10% excess · wear & tear excluded", "n_a", 0, 0, true],
  ["D-0015", "in_house", 1, "expired", "Standard cover · 1 Month · £1,000 claim limit · £60 diagnostics · 10% excess · wear & tear excluded", "n_a", 0, 0, true],
  ["D-0015", "external", 12, "active", "Comprehensive cover · 12 Months · £5,000 claim limit · £100 diagnostics · no excess · wear & tear covered", "purchased", 320, 449, false],
  ["D-0019", "in_house", 3, "active", "Premier cover · 3 Months · £2,000 claim limit · £60 diagnostics · 10% excess · wear & tear excluded", "n_a", 0, 0, true],
  ["D-0033", "external", 6, "active", "Comprehensive cover · 6 Months · £5,000 claim limit · £100 diagnostics · no excess · wear & tear covered", "pending", 210, 299, true],
  ["D-0036", "in_house", 6, "active", "Premier cover · 6 Months · £2,000 claim limit · £60 diagnostics · 10% excess · wear & tear excluded", "n_a", 0, 199, true],
  ["D-0039", "in_house", 1, "expired", "Standard cover · 1 Month · £1,000 claim limit · £60 diagnostics · 10% excess · wear & tear excluded", "n_a", 0, 0, true],
  ["D-0040", "in_house", 3, "cancelled", "Premier cover · 3 Months · £2,000 claim limit · £60 diagnostics · 10% excess · wear & tear excluded", "n_a", 0, 0, true],
];
await put("warranties", WARRANTIES.map(([stock, type, months, status, coverage, purchase, dealerCost, custCost, linked], i) => {
  const c = car(stock);
  const inv = invoiceFor.get(stock);
  const start = (c.date_sold as string) ?? dAgo(7);
  const end = new Date(Date.parse(`${start}T12:00:00Z`));
  end.setUTCMonth(end.getUTCMonth() + months);
  const purchased = purchase === "purchased";
  const created = `${start}T15:00:00.000Z`;
  return {
    id: id("warranties", i + 1), company_id: COMPANY, vehicle_id: c.id, sale_deal_id: inv?.deal ?? null,
    invoice_id: linked ? inv?.id ?? null : null, customer_name: inv?.customer ?? "Demo Customer",
    customer_phone: inv?.phone ?? phone(499), customer_email: inv?.email ?? null, type,
    provider: type === "in_house" ? "Car Capital" : "SafeDrive Warranties", coverage_details: coverage,
    start_date: start, end_date: end.toISOString().slice(0, 10), cost_to_dealership: dealerCost,
    cost_to_customer: custCost, status, certificate_generated: status !== "cancelled",
    purchase_status: purchase, purchased_at: purchased ? addDays(start, 2) + "T10:00:00.000Z" : null,
    purchased_by: purchased ? OWNER : null, provider_reference: purchased ? `SDW-DEMO-${10231 + i}` : null,
    amount_paid: purchased ? dealerCost : null, created_at: created, updated_at: created,
  };
}));
await put("warranty_claims", [
  { n: 4, stock: "D-0019", issue: "Engine management light comes on intermittently after a motorway run.", complaint: false, est: 250, actual: null, status: "open", resolution: null, ago: 6, resolved: null },
  { n: 3, stock: "D-0015", issue: "Turbo actuator fault: car going into limp mode.", complaint: true, est: 900, actual: 845, status: "resolved", resolution: "Actuator replaced by SafeDrive's approved garage; customer satisfied.", ago: 24, resolved: 16 },
].map((w, i) => ({
  id: id("warranty_claims", i + 1), warranty_id: id("warranties", w.n), vehicle_id: car(w.stock).id,
  company_id: COMPANY, customer_name: invoiceFor.get(w.stock)?.customer ?? "Demo Customer",
  issue_description: w.issue, is_complaint: w.complaint, estimated_cost: w.est, actual_cost: w.actual,
  status: w.status, resolution: w.resolution, resolved_at: w.resolved == null ? null : hAgo(w.resolved * 24),
  created_at: hAgo(w.ago * 24),
})));

// ─── returns ──────────────────────────────────────────────────────────────
const r40 = invoiceFor.get("D-0040");
const r19 = invoiceFor.get("D-0019");
await put("vehicle_returns", [
  {
    id: id("vehicle_returns", 1), company_id: COMPANY, vehicle_id: car("D-0040").id, sale_deal_id: r40?.deal ?? null,
    customer_name: r40?.customer ?? "Demo Customer", customer_phone: r40?.phone ?? phone(498),
    return_date: dAgo(14), reason: "Gearbox judders when pulling away; customer wants a refund.",
    reason_code: "mechanical_fault", resolution_path: "vendor", resolution_notes: "Gearbox specialist inspecting before we agree the refund.",
    refund_amount: r40?.total ?? null, status: "in_review", original_invoice_id: r40?.id ?? null,
    resolved_at: null, created_at: hAgo(14 * 24),
  },
  {
    id: id("vehicle_returns", 2), company_id: COMPANY, vehicle_id: car("D-0019").id, sale_deal_id: r19?.deal ?? null,
    customer_name: r19?.customer ?? "Demo Customer", customer_phone: r19?.phone ?? phone(497),
    return_date: dAgo(4), reason: "Changed mind, found a cheaper car elsewhere.",
    reason_code: "customer_change_of_mind", resolution_path: "other",
    resolution_notes: "Outside the 14-day cooling-off period; customer keeps the car.",
    refund_amount: null, status: "rejected", original_invoice_id: r19?.id ?? null,
    resolved_at: hAgo(3 * 24), created_at: hAgo(4 * 24),
  },
]);
// The returned car sits in 'returned' until the case closes (as the app does).
{
  const { error } = await db.from("vehicles").update({ status: "returned" })
    .eq("id", car("D-0040").id).eq("is_demo", true);
  if (error) throw error;
}

// ─── external invoices ────────────────────────────────────────────────────
const auctionCar = car("D-0038");
const auctionTotal = Math.round((Number(auctionCar.buying_price ?? 0) + Number(auctionCar.buyers_fee ?? 0) * 1.2) * 100);
const auctionVat = Math.round(Number(auctionCar.buyers_fee ?? 0) * 0.2 * 100);
await put("external_invoices", [
  { n: 1, kind: "auction_purchase", number: "AUC-DEMO-55102", v: 7, stock: "D-0038", ago: 19, total: auctionTotal, vat: auctionVat, desc: `Auction purchase: ${label(auctionCar)}`, prev: "1 previous keeper (private)", sh: "Partial service history, 4 stamps" },
  { n: 2, kind: "external_job", number: "NB-2291", v: 2, stock: "D-0013", ago: 3, total: 26400, vat: 4400, desc: "Rear bumper scuff repair & respray", prev: null, sh: null },
  { n: 3, kind: "external_job", number: "PRAE-0417", v: 5, stock: "D-0017", ago: 4, total: 9000, vat: 1500, desc: "Aircon regas + leak test", prev: null, sh: null },
].map((e) => ({
  id: id("external_invoices", e.n), invoice_kind: e.kind, invoice_number: e.number, vendor_id: vendor(e.v),
  vehicle_id: car(e.stock).id, invoice_date: dAgo(e.ago), total_pence: e.total, vat_pence: e.vat,
  description: e.desc, notes: null, previous_owner: e.prev,
  service_history_ref: e.sh, created_by: OWNER, created_at: hAgo(e.ago * 24 - 3), updated_at: hAgo(e.ago * 24 - 3),
})));

// ─── location movements (+ the cars' current location) ────────────────────
type Move = [string, string, string, number | null, number | null, number, number | null, number | null, string | null];
// stock, from, to, vendor#, staff idx, hours ago, expected back (h ahead), returned (h ago), notes
const MOVES: Move[] = [
  ["D-0017", "forecourt", "garage", 5, null, 170, null, 98, "Aircon + TPMS"],
  ["D-0017", "garage", "forecourt", null, null, 98, null, null, null],
  ["D-0014", "forecourt", "garage", 6, null, 120, null, 48, "Valet & polish before photos"],
  ["D-0014", "garage", "forecourt", null, null, 48, null, null, null],
  ["D-0025", "forecourt", "yard", null, null, 240, null, null, "Awaiting inspection slot"],
  ["D-0021", "forecourt", "yard", null, null, 90, null, null, null],
  ["D-0013", "forecourt", "garage", 2, null, 72, 48, null, "Bumper respray"],
  ["D-0007", "forecourt", "garage", 1, null, 46, 24, null, "Service + tyres"],
  ["D-0003", "forecourt", "staff", null, 1, 24, 6, null, "Fuel + valet before handover"],
];
await put("location_movements", MOVES.map(([stock, from, to, v, s, ago, back, returned, notes], i) => ({
  id: id("location_movements", i + 1), vehicle_id: car(stock).id, from_location: from, to_location: to,
  external_vendor_id: to === "garage" ? vendor(v!) : null, staff_user_id: to === "staff" ? user(s!) : null,
  expected_return_at: back == null ? null : hAgo(-back), actual_return_at: returned == null ? null : hAgo(returned),
  notes, created_by: user(i), created_at: hAgo(ago),
})));
// Latest move per car decides where it is now.
const latest = new Map<string, Move>();
for (const m of MOVES) if (!latest.has(m[0]) || latest.get(m[0])![5] > m[5]) latest.set(m[0], m);
for (const [stock, m] of latest) {
  const { error } = await db.from("vehicles").update({ current_location: m[2], location_since: hAgo(m[5]) })
    .eq("id", car(stock).id).eq("is_demo", true);
  if (error) throw error;
}
// Prep & Repair owners for the cars being prepared (D-0021 stays Unassigned).
for (const [stock, who] of [["D-0007", 1], ["D-0013", 2], ["D-0017", 0]] as const) {
  const { error } = await db.from("vehicles").update({ prep_assigned_to: user(who) })
    .eq("id", car(stock).id).eq("is_demo", true);
  if (error) throw error;
}

// ─── walk-in workshop jobs ────────────────────────────────────────────────
await put("workshop_jobs", [
  ["Nadia Testwell", "AB12 CDE", "Ford Fiesta 1.0 EcoBoost", "Interim service", "pending", -1, "09:00", 149, null, 30],
  ["Oscar Mockford", "EF34 GHJ", "Vauxhall Corsa 1.2", "MOT + brake check", "in_progress", 0, "10:30", 95, null, 2],
  ["Paula Sampleton", "KL56 MNP", "Toyota Yaris Hybrid", "Replace rear tyres (x2)", "completed", 2, "14:00", 170, 170, 70],
  ["Reza Demoley", "RS78 TUV", "Nissan Juke 1.6", "Diagnostic: engine warning light", "pending", -3, "13:00", 60, null, 20],
].map(([name, reg, desc, job, status, ago, time, est, actual, created], i) => ({
  id: id("workshop_jobs", i + 1), company_id: COMPANY, customer_name: name, customer_phone: phone(501 + i),
  vehicle_reg: reg, vehicle_description: desc, description: job, status, scheduled_date: dAgo(ago as number),
  scheduled_time: time, estimated_cost: est, actual_cost: actual, assigned_to: user(i + 1),
  completed_date: status === "completed" ? dAgo(ago as number) : null, notes: null,
  created_at: hAgo(created as number), updated_at: hAgo(Math.max((created as number) - 1, 1)),
})));

// ─── notifications ────────────────────────────────────────────────────────
const lead = (n: number) => LEADS[n - 1];
await put("notifications", [
  [OWNER, "info", `New lead: ${lead(1)[0]}`, `Interested in ${label(car("D-0024"))}`, "/sales/leads", false, 4],
  [OWNER, "info", `New lead: ${lead(3)[0]}`, `Interested in ${label(car("D-0011"))}`, "/sales/leads", false, 8],
  [OWNER, "urgent", `MOT expires soon: ${car("D-0021").registration}`, `${title(car("D-0021").make as string)} ${title(car("D-0021").model as string)} (${car("D-0021").registration}): MOT due within 30 days.`, `/vehicles/${car("D-0021").id}`, false, 20],
  [OWNER, "warning", "Warranty claim opened", `${invoiceFor.get("D-0019")?.customer}: engine management light (${car("D-0019").registration})`, "/warranties/claims", false, 144],
  [OWNER, "info", "Return in review", `${car("D-0040").registration} is back with us: gearbox judder`, "/admin/vehicle-returns", true, 330],
  [user(1), "info", `New lead: ${lead(2)[0]}`, `Interested in ${label(car("D-0009"))}`, "/sales/leads", false, 50],
].map(([user_id, type, t, body, link, read, ago], i) => ({
  id: id("notifications", i + 1), company_id: COMPANY, user_id, type, title: t, body, link, read,
  created_at: hAgo(ago as number),
})));

// ─── activity log (~45 recent entries, shaped like the app writes them) ───
const reg = (s: string) => car(s).registration as string;
const inv = (s: string) => invoiceFor.get(s)!;
const A: [number, number, string | null, string, string, Record<string, unknown>][] = [
  [700, 0, "D-0015", "warranty_purchased", `Marked SafeDrive Warranties warranty purchased for ${inv("D-0015").customer}`, { warrantyId: id("warranties", 3), provider: "SafeDrive Warranties", providerReference: "SDW-DEMO-10233", amountPaid: 320 }],
  [336, 1, "D-0040", "vehicle_returned", `${inv("D-0040").customer} returned ${reg("D-0040")}: vendor`, { returnId: id("vehicle_returns", 1), resolutionPath: "vendor" }],
  [335, 1, "D-0040", "warranty_cancelled", `Cancelled warranty for ${inv("D-0040").customer} (Vehicle returned)`, { event: "warranty_cancelled", reason: "Vehicle returned", warrantyId: id("warranties", 8) }],
  [240, 2, "D-0025", "vehicle_moved", `${reg("D-0025")}: forecourt → yard`, { movementId: id("location_movements", 5), from: "forecourt", to: "yard" }],
  [216, 0, "D-0024", "vehicle_arrived", `${label(car("D-0024"))} received`, { stockId: "D-0024" }],
  [214, 1, "D-0009", "vehicle_arrived", `${label(car("D-0009"))} received`, { stockId: "D-0009" }],
  [190, 1, "D-0007", "inspection_started", `Inspection started for ${reg("D-0007")}`, {}],
  [188, 1, "D-0007", "inspection_completed", `Inspection completed for ${reg("D-0007")}: 2 items need attention`, { flagged: 2 }],
  [187, 1, "D-0007", "maintenance_job_created", `New stock maintenance job created for ${reg("D-0007")}`, { jobId: id("maintenance_jobs", 2) }],
  [186, 1, "D-0007", "todo_added", "Added: Tyres Condition: Replace (front pair)", { source: "inspection" }],
  [170, 0, "D-0017", "vehicle_moved", `${reg("D-0017")}: forecourt → garage`, { movementId: id("location_movements", 1), from: "forecourt", to: "garage" }],
  [160, 2, "D-0009", "listing_created", `Listing created for ${reg("D-0009")}`, { listingId: id("listings", listed.findIndex((c) => c.stock_id === "D-0009") + 1) }],
  [159, 2, "D-0009", "listing_published", `${car("D-0009").make} ${car("D-0009").model} ${reg("D-0009")} published`, { listingId: id("listings", listed.findIndex((c) => c.stock_id === "D-0009") + 1) }],
  [144, 0, "D-0019", "warranty_claim_opened", "Warranty claim: Engine management light comes on intermittently after a motorway run.", { claimId: id("warranty_claims", 1), isComplaint: false }],
  [140, 2, "D-0008", "lead_status_changed", `Lead ${lead(11)[0]} marked Lost: Bought elsewhere (cheaper)`, { leadId: id("leads", 11), from: "contacted", to: "lost" }],
  [120, 0, "D-0036", "sale_stage_changed", `${reg("D-0036")} → completed sale`, { dealId: inv("D-0036").deal, stage: "completed_sale" }],
  [119, 0, "D-0036", "sale_completed", `${reg("D-0036")} sold to ${inv("D-0036").customer}`, { dealId: inv("D-0036").deal }],
  [118, 0, "D-0036", "invoice_created", `Invoice ${inv("D-0036").number} (sale) created: ${inv("D-0036").customer}`, { total: inv("D-0036").total, invoiceId: inv("D-0036").id }],
  [117, 0, "D-0036", "warranty_created", `In-house warranty for ${reg("D-0036")}`, { type: "in_house", provider: "Car Capital", vehicleReg: reg("D-0036"), warrantyId: id("warranties", 6), customerName: inv("D-0036").customer }],
  [100, 0, "D-0017", "maintenance_job_completed", `Maintenance completed for ${reg("D-0017")}`, { jobId: id("maintenance_jobs", 5) }],
  [98, 0, "D-0017", "vehicle_moved", `${reg("D-0017")}: garage → forecourt`, { movementId: id("location_movements", 2), from: "garage", to: "forecourt" }],
  [96, 2, "D-0019", "vehicle_returned", `${inv("D-0019").customer} returned ${reg("D-0019")}: other`, { returnId: id("vehicle_returns", 2), resolutionPath: "other" }],
  [90, 1, "D-0021", "vehicle_moved", `${reg("D-0021")}: forecourt → yard`, { movementId: id("location_movements", 6), from: "forecourt", to: "yard" }],
  [74, 1, "D-0012", "sale_completed", `${reg("D-0012")} sold to ${inv("D-0012").customer}`, { dealId: inv("D-0012").deal }],
  [73.5, 1, "D-0012", "invoice_created", `Invoice ${inv("D-0012").number} (sale) created: ${inv("D-0012").customer}`, { total: inv("D-0012").total, invoiceId: inv("D-0012").id }],
  [73, 1, "D-0012", "invoice_paid", `${inv("D-0012").number} paid in full`, { amount: inv("D-0012").total - 500, settled: true, invoiceId: inv("D-0012").id, receiptId: inv("D-0012").receipt, balanceDue: 0 }],
  [72.5, 1, "D-0012", "warranty_created", `In-house warranty for ${reg("D-0012")}`, { type: "in_house", provider: "Car Capital", vehicleReg: reg("D-0012"), warrantyId: id("warranties", 1), customerName: inv("D-0012").customer }],
  [72, 2, "D-0019", "return_rejected", `Return ${reg("D-0019")} → rejected`, { returnId: id("vehicle_returns", 2), status: "rejected" }],
  [71, 0, "D-0033", "sale_completed", `${reg("D-0033")} sold to ${inv("D-0033").customer}`, { dealId: inv("D-0033").deal }],
  [70.5, 0, "D-0033", "invoice_created", `Invoice ${inv("D-0033").number} (sale) created: ${inv("D-0033").customer}`, { total: inv("D-0033").total, invoiceId: inv("D-0033").id }],
  [70, 0, "D-0033", "warranty_created", `External warranty for ${reg("D-0033")}`, { type: "external", provider: "SafeDrive Warranties", vehicleReg: reg("D-0033"), warrantyId: id("warranties", 5), customerName: inv("D-0033").customer }],
  [69, 0, "D-0013", "external_invoice_created", "External invoice: external job · £264.00", { invoiceId: id("external_invoices", 2), kind: "external_job", vendorId: vendor(2) }],
  [50, 2, "D-0009", "lead_created", `Lead from website: ${lead(2)[0]} interested in ${label(car("D-0009"))}`, { leadId: id("leads", 2) }],
  [48, 2, "D-0013", "maintenance_job_created", `New stock maintenance job created for ${reg("D-0013")}`, { jobId: id("maintenance_jobs", 3) }],
  [46, 1, "D-0007", "vehicle_moved", `${reg("D-0007")}: forecourt → garage`, { movementId: id("location_movements", 8), from: "forecourt", to: "garage" }],
  [30, 0, "D-0001", "lead_status_changed", `Lead ${lead(5)[0]} moved new → contacted`, { leadId: id("leads", 5), from: "new", to: "contacted" }],
  [28, 0, "D-0010", "appointment_booked", `Appointment booked: ${lead(8)[0]} on ${dAgo(-1)} 11:00`, { appointmentId: id("appointments", 1) }],
  [27, 0, "D-0010", "lead_status_changed", `Lead ${lead(8)[0]} moved contacted → appointment booked`, { leadId: id("leads", 8), from: "contacted", to: "appointment_booked" }],
  [26, 0, "D-0010", "lead_converted", `Deal opened for ${lead(8)[0]}`, { dealId: id("sales_deals", 4), leadId: id("leads", 8) }],
  [24, 1, "D-0003", "vehicle_moved", `${reg("D-0003")}: forecourt → staff`, { movementId: id("location_movements", 9), from: "forecourt", to: "staff" }],
  [22, 0, "D-0010", "deal_note_added", `Deal note added for ${lead(8)[0]}: Test drive booked for tomorrow 11am. Bringing proof of addre`, { dealId: id("sales_deals", 4), noteId: id("deal_notes", 2) }],
  [20, 2, "D-0034", "appointment_completed", `${APPTS[6][1]}, outcome: test drive`, { appointmentId: id("appointments", 7), outcome: "test_drive" }],
  [10, 0, "D-0007", "prep_assigned", `${reg("D-0007")} assigned for prep`, { prepAssignedTo: user(1) }],
  [8, 1, "D-0011", "lead_created", `Lead from facebook: ${lead(3)[0]} interested in ${label(car("D-0011"))}`, { leadId: id("leads", 3) }],
  [6, 2, "D-0005", "todo_completed", "Marked completed: Replace front brake pads & discs", {}],
  [4, 0, "D-0024", "lead_created", `Lead from autotrader: ${lead(1)[0]} interested in ${label(car("D-0024"))}`, { leadId: id("leads", 1) }],
  [3, 0, "D-0024", "appointment_booked", `Appointment booked: Omar Placeford on ${dAgo(0)} 16:00`, { appointmentId: id("appointments", 4) }],
  [2.5, 3, "D-0020", "cost_updated", `${reg("D-0020")} updated`, {}],
  [2, 1, null, "workshop_job_created", "Walk-in workshop job: Oscar Mockford (MOT + brake check)", { jobId: id("workshop_jobs", 2), vehicleReg: "EF34 GHJ" }],
  [1, 3, "D-0014", "vehicle_status_changed", `${reg("D-0014")} → photos_pending`, { newStatus: "photos_pending" }],
];
// Pad to LAST_ACTIVITY ids so the idempotency check keys off the final row.
const activity = A.map(([ago, who, stock, action_type, description, metadata], i) => ({
  id: id("activity_log", LAST_ACTIVITY - A.length + 1 + i), company_id: COMPANY, user_id: user(who),
  vehicle_id: stock ? car(stock).id : null, action_type, description, metadata, created_at: hAgo(ago),
}));
await put("activity_log", activity);

console.log("Inserted (new rows this run):");
for (const [t, n] of Object.entries(counts)) console.log(`  ${t.padEnd(24)} ${n}`);
console.log("Every row id starts de300000-; leads/appointments/invoices are also is_demo = true.");
