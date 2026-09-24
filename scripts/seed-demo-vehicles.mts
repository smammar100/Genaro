/**
 * Seed ~40 realistic DEMO cars (plus to-dos and deals) to preview the UI.
 *
 *   node scripts/seed-demo-vehicles.mts --company <uuid> --user <uuid>
 *
 * Every row is is_demo = true, so the launch-day wipe (migration 0046's
 * is_demo cleanup) removes them, and stock IDs are `D-0001…` so the company's
 * real CC- sequence is untouched. Skips if D- cars already exist.
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { computeCostTotals } from "../src/lib/vehicle-costs.ts";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const COMPANY = arg("company");
const USER = arg("user");
if (!COMPANY || !USER) {
  console.error("Usage: node scripts/seed-demo-vehicles.mts --company <uuid> --user <uuid>");
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

// Deterministic pseudo-random so re-seeding gives the same cars.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const between = (a: number, b: number) => Math.round(a + rand() * (b - a));
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);

const MODELS = [
  ["TOYOTA", "PRIUS", "hatchback", "hybrid"], ["TOYOTA", "C-HR", "suv", "hybrid"],
  ["NISSAN", "QASHQAI", "suv", "petrol"], ["NISSAN", "LEAF", "hatchback", "electric"],
  ["FORD", "FIESTA", "hatchback", "petrol"], ["FORD", "FOCUS", "hatchback", "diesel"],
  ["BMW", "3 SERIES", "saloon", "diesel"], ["BMW", "X1", "suv", "petrol"],
  ["VAUXHALL", "ASTRA", "hatchback", "petrol"], ["MERCEDES-BENZ", "C CLASS", "saloon", "diesel"],
  ["AUDI", "A3", "hatchback", "petrol"], ["VOLKSWAGEN", "GOLF", "hatchback", "petrol"],
  ["LAND ROVER", "DISCOVERY SPORT", "suv", "diesel"], ["HONDA", "JAZZ", "hatchback", "hybrid"],
  ["TOYOTA", "ALPHARD", "mpv", "hybrid"], ["NISSAN", "SERENA", "mpv", "hybrid"],
] as const;
const COLOURS = ["BLACK", "WHITE", "SILVER", "GREY", "BLUE", "RED"];
const AUCTIONS = ["BCA AUCTION", "BLACKBUSHE", "CAMBERLEY", "PADDOCK WOOD", "SOR", "PARTEX"];
const OWNERS = ["BCA", "CAR CAPITAL", "DEALERS/PRIV. SELLERS", "INFINIT"];
const AGENTS = ["AUTO TRADER", "ZUTO", "WALK IN", "CAR GURUS", "CAR FINANCE 247"];
const CUSTOMERS = ["Aisha Khan", "Tom Hughes", "Priya Patel", "James Carter", "Zara Ahmed", "Oliver Reid", "Hannah Lee", "Usman Ali"];
const TODOS = [["Full service", 180], ["MOT", 55], ["Valet", 40], ["Replace front tyres", 160], ["Bodywork: rear bumper", 220], ["Fuel", 30]] as const;
// Pipeline mix so every screen has something in it.
const STATUSES = ["received", "inspection_pending", "being_prepared", "photos_pending", "ready", "listed", "listed", "reserved", "sold", "sold", "sold"] as const;

const { count } = await db.from("vehicles").select("id", { count: "exact", head: true })
  .eq("company_id", COMPANY).like("stock_id", "D-%");
if ((count ?? 0) > 0) {
  console.log(`${count} demo cars (D-…) already exist — nothing to do.`);
  process.exit(0);
}

const vehicles = [];
for (let i = 1; i <= 40; i++) {
  const [make, model, body, fuel] = pick(MODELS);
  const status = pick(STATUSES);
  const received = between(3, 120);
  const buying = between(20, 140) * 100;
  const buyersFee = between(200, 450);
  const delivery = between(60, 180);
  const vatPaid = rand() < 0.4;
  const costs = {
    buyingPrice: buying, vatOnBuyingPrice: 0,
    buyersFee, vatOnBuyersFee: vatPaid ? Math.round(buyersFee * 0.2) : null,
    inspectionCharge: rand() < 0.6 ? 49.5 : null, vatOnInspectionCharge: null,
    evAssuredCharge: fuel === "electric" || fuel === "hybrid" ? 75 : null, vatOnEvAssuredCharge: null,
    batteryReportFee: fuel === "electric" ? 45 : null, vatOnBatteryReportFee: null,
    lateStorageFee: null, vatOnLateStorageFee: null,
    collectionFee: rand() < 0.5 ? 60 : null, vatOnCollectionFee: null,
    deliveryFee: delivery, vatOnDeliveryFee: vatPaid ? Math.round(delivery * 0.2) : null,
    otherCharges: null, loadingFee: null, unloadingFee: null,
    stockingCharges: 0, valueAddition: 0, warrantyCost: null,
  };
  const totals = computeCostTotals(costs);
  const listing = Math.round((buying * 1.28 + 900) / 100) * 100;
  const sold = status === "sold";
  const sellingPrice = sold ? listing - between(0, 6) * 100 : null;
  const dateSold = sold ? daysAgo(between(0, Math.max(1, received - 2))) : null;
  const plateAge = pick(["15", "16", "17", "18", "19", "66", "67", "68", "69", "70"]);
  const reg = `${pick(["LT", "PK", "WF", "HN", "SB", "GK", "RK"])}${plateAge} ${String.fromCharCode(65 + (i % 26))}${pick(["JD", "KX", "RT", "YU", "PL"])}`;
  vehicles.push({
    company_id: COMPANY, stock_id: `D-${String(i).padStart(4, "0")}`, is_demo: true,
    registration: reg, make, model, variant_name: pick(["SE", "ICON", "SPORT", "LX", "TITANIUM"]),
    year: Number(plateAge) >= 50 ? 2000 + Number(plateAge) - 50 : 2000 + Number(plateAge),
    colour: pick(COLOURS), mileage: between(18, 110) * 1000,
    vehicle_type: "car", body_type: body, fuel_type: fuel,
    transmission: rand() < 0.7 ? "automatic" : "manual",
    received_date: daysAgo(received), received_by: USER,
    seller_name: pick(AUCTIONS), seller_phone: "", purchase_source: "auction",
    local_or_import: rand() < 0.3 ? "import" : "local",
    auction_house: pick(AUCTIONS), owned_by: pick(OWNERS), owner_details: pick(["BCA", "CAR CAPITAL", "HAFEEZ BHAI"]),
    invoice_date: daysAgo(received + between(1, 12)),
    finance_provider: "none", service_history: pick(["full", "partial", "none", "unknown"]),
    num_keys: pick([1, 2, 2]), lock_nut: rand() < 0.7, v5_received: rand() < 0.8,
    log_book: rand() < 0.8 ? "AVAILABLE" : "NOT AVAILABLE", num_seats: body === "mpv" ? 7 : 5,
    former_keepers: between(1, 5),
    buying_price: buying, vat_on_buying_price: 0,
    buyers_fee: costs.buyersFee, vat_on_buyers_fee: costs.vatOnBuyersFee,
    inspection_charge: costs.inspectionCharge, ev_assured_charge: costs.evAssuredCharge,
    battery_report_fee: costs.batteryReportFee, collection_fee: costs.collectionFee,
    delivery_fee: costs.deliveryFee, vat_on_delivery_fee: costs.vatOnDeliveryFee,
    total_buying_price: totals.totalBuyingPrice, landed_cost: totals.landedCost, base_cost: totals.baseCost,
    stocking_charges: 0, value_addition: 0,
    listing_price: ["listed", "reserved", "sold", "ready"].includes(status) ? listing : null,
    minimum_sale_price: listing - 500,
    selling_price: sellingPrice, date_sold: dateSold, selling_agent: sold ? pick(AGENTS) : null,
    gross_earning: sellingPrice ? Math.round(sellingPrice - totals.baseCost) : Math.round(listing - totals.baseCost),
    status, sale_status: sold ? "sold" : "available",
    days_in_stock: sold ? Math.max(1, received - 5) : received,
    removed_from_website_at: sold ? `${dateSold}T00:00:00.000Z` : null,
    images_count: 0,
  });
}

const { data: inserted, error } = await db.from("vehicles").insert(vehicles).select("id, stock_id, status, base_cost, listing_price, selling_price, date_sold");
if (error) throw error;

// Things to Do — the costs roll up into value addition, like the app does.
const todos = [];
const vaByVehicle = new Map<string, number>();
for (const v of inserted!) {
  const n = between(0, 3);
  let va = 0;
  for (let k = 1; k <= n; k++) {
    const [desc, cost] = pick(TODOS);
    const done = v.status !== "received" && v.status !== "being_prepared" ? true : rand() < 0.4;
    todos.push({ vehicle_id: v.id, serial_number: k, description: desc, cost, source: "manual",
      status: done ? "completed" : "pending", created_by: USER,
      ...(done ? { completed_by: USER, completed_at: new Date().toISOString() } : {}) });
    va += cost;
  }
  vaByVehicle.set(v.id, va);
}
if (todos.length) {
  const { error: tErr } = await db.from("todo_items").insert(todos);
  if (tErr) throw tErr;
}
for (const v of inserted!) {
  const va = vaByVehicle.get(v.id) ?? 0;
  if (!va) continue;
  const base = Number(v.base_cost) + va;
  const top = v.selling_price ?? v.listing_price;
  await db.from("vehicles").update({
    value_addition: va, landed_cost: base, base_cost: base,
    gross_earning: top == null ? null : Math.round(Number(top) - base),
  }).eq("id", v.id);
}

// Deals for sold / reserved cars so the dashboard and pipeline fill in.
const deals = inserted!
  .filter((v) => v.status === "sold" || v.status === "reserved")
  .map((v) => ({
    company_id: COMPANY, vehicle_id: v.id, customer_name: pick(CUSTOMERS),
    customer_phone: `07700 9${between(10000, 99999)}`, selling_agent: USER,
    stage: v.status === "sold" ? "completed_sale" : "deposit_taken",
    agreed_price: v.selling_price ?? v.listing_price,
    completion_date: v.status === "sold" ? v.date_sold : null,
  }));
if (deals.length) {
  const { error: dErr } = await db.from("sales_deals").insert(deals);
  if (dErr) throw dErr;
}

console.log(`Seeded ${inserted!.length} demo cars (D-0001…), ${todos.length} to-dos, ${deals.length} deals. All is_demo = true.`);
