/**
 * Release check: is every value the app can save allowed by the live
 * database? (bug list 2026-11-06: CarGurus leads failed because leads.source
 * didn't allow 'cargurus'.)
 *
 *   pnpm check:db-values        (also runs before every `pnpm build`)
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, from the
 * environment or .env.local, and migration 0063 (public.allowed_values()).
 *
 * Fails (exit 1) only on a real mismatch: a value the app can save that the
 * database would refuse. Without credentials, or when the database can't be
 * reached, it warns and lets the build carry on, so a network hiccup never
 * blocks a release. Pass --strict to fail in those cases too.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareWithDatabase, loggedActionTypes } from "./db-values.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const inCi = Boolean(process.env.GITHUB_ACTIONS);

const say = (msg) => console.log(`db-values: ${msg}`);
const warn = (msg) => console.log(inCi ? `::warning::db-values: ${msg}` : `db-values: warning: ${msg}`);
const fail = (msg) => console.log(inCi ? `::error::db-values: ${msg}` : `db-values: ERROR: ${msg}`);

/** A step we can't do: warn and carry on, or fail with --strict. */
function cannotCheck(msg) {
  if (strict) {
    fail(msg);
    process.exit(1);
  }
  warn(`${msg} Skipping the check; the build carries on.`);
  process.exit(0);
}

function readEnvLocal() {
  const file = join(root, ".env.local");
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

function sourceFiles(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== "node_modules" && !f.startsWith(".")) sourceFiles(p, out);
    } else if (/\.(ts|tsx)$/.test(f) && !/\.test\.|\.stories\./.test(f)) {
      out.push(p);
    }
  }
  return out;
}

const local = readEnvLocal();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || local.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  local.SUPABASE_SERVICE_ROLE_KEY ||
  local.SUPABASE_SECRET_KEY;
if (!url || !key) cannotCheck("No NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");

let checks;
try {
  const headers = { apikey: key, "Content-Type": "application/json" };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/allowed_values`, {
    method: "POST",
    headers,
    body: "{}",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    cannotCheck(
      res.status === 404
        ? "The database has no allowed_values() function. Apply migration 0063."
        : `The database answered ${res.status}: ${body}`,
    );
  }
  checks = await res.json();
} catch (e) {
  cannotCheck(`Couldn't reach the database (${e instanceof Error ? e.message : String(e)}).`);
}

const typesSource = readFileSync(join(root, "src/lib/types.ts"), "utf8");
const logged = loggedActionTypes(sourceFiles(join(root, "src")).map((f) => readFileSync(f, "utf8")));
const { refused, unchecked, missingTypes, checked } = compareWithDatabase(checks, typesSource, logged);

for (const t of missingTypes) warn(`Couldn't read the app type for ${t}; that column wasn't checked.`);
if (unchecked.length) say(`Not checked (no app type mapped in scripts/db-values.mjs): ${unchecked.join(", ")}.`);

if (refused.length) {
  for (const r of refused) {
    fail(
      `${r.column}: the app can save ${r.refused.map((v) => `'${v}'`).join(", ")}, but the database ` +
        `refuses ${r.refused.length === 1 ? "it" : "them"} (check ${r.constraint} allows only ${r.allowed.join(", ")}).`,
    );
  }
  fail("Add a migration that allows these values and apply it before releasing, or the saves will fail for staff.");
  process.exit(1);
}

say(`OK: ${checked} columns checked; the database allows every value the app can save.`);
