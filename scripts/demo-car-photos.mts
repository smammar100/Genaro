/**
 * Give the DEMO cars (is_demo = true, stock IDs D-…) a hero photo from
 * Unsplash so thumbnails can be previewed. Real cars are never touched.
 *
 *   node scripts/demo-car-photos.mts            # dry run
 *   node scripts/demo-car-photos.mts --apply
 *
 * Photos are hand-picked exterior shots per model (the Unsplash licence
 * allows free use; hotlinking images.unsplash.com is how Unsplash serves
 * them). Where Unsplash had nothing for a model, a car of the same body type
 * stands in. Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// images.unsplash.com photo ids, keyed "MAKE|MODEL".
const PHOTOS: Record<string, string[]> = {
  "TOYOTA|PRIUS": ["photo-1627028410682-5f777d6ebf13", "photo-1740982880890-a4768e05a875"],
  "TOYOTA|C-HR": ["photo-1711978477980-a0f1a05039a0"],
  "NISSAN|QASHQAI": [
    "photo-1684839371407-17bddcf946d0",
    "photo-1684838976566-780c088d5350",
    "photo-1684838997746-2fa4bc6b6194",
  ],
  "NISSAN|LEAF": ["photo-1557775209-f28ede453ae3"],
  "FORD|FIESTA": ["photo-1551206820-1a2050e76dd7", "photo-1653232041322-fc073b6ae7c7"],
  "FORD|FOCUS": [
    "photo-1708849894321-2c9bc515df0e",
    "photo-1696570351620-d364f080db9d",
    "photo-1708849894797-9f38d13386fd",
  ],
  "BMW|3 SERIES": ["photo-1718903502278-f81c5a754294", "photo-1734554284184-4bcf245250c5"],
  "BMW|X1": ["photo-1677517859847-0e750bfd13a9", "photo-1680298255666-6071fc905870"],
  "VAUXHALL|ASTRA": ["photo-1767949374153-b49525966e9d", "photo-1767949374275-953c7096454e"],
  "MERCEDES-BENZ|C CLASS": ["photo-1591230740238-e9a71182b67c", "photo-1616874946938-69c1374f3e60"],
  "AUDI|A3": ["photo-1717711081688-985a7a3e6a9f", "photo-1622701579527-dcd1bb5fbb9b"],
  "VOLKSWAGEN|GOLF": ["photo-1574581501439-6405a98bd76c", "photo-1572811298797-9eecadf6cb24"],
  "LAND ROVER|DISCOVERY SPORT": ["photo-1578564810934-c131250d3792", "photo-1658328565500-c5c668e6a52b"],
  "HONDA|JAZZ": ["photo-1742021923146-039f25019c0a", "photo-1635702820786-a10548e3732f"],
  "TOYOTA|ALPHARD": ["photo-1558101847-e017d5e414a4"],
  "NISSAN|SERENA": ["photo-1558101847-e017d5e414a4"],
};
const url = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=600&q=75`;

const { data: cars, error } = await db
  .from("vehicles")
  .select("id, stock_id, make, model, hero_image_url")
  .eq("is_demo", true)
  .like("stock_id", "D-%")
  .order("stock_id");
if (error) throw error;

let changed = 0;
for (const [i, car] of (cars ?? []).entries()) {
  const ids = PHOTOS[`${car.make}|${car.model}`];
  if (!ids) {
    console.log(`${car.stock_id} ${car.make} ${car.model}: no photo, skipped`);
    continue;
  }
  const next = url(ids[i % ids.length]);
  if (car.hero_image_url === next) continue;
  changed++;
  console.log(`${car.stock_id} ${car.make} ${car.model} → ${ids[i % ids.length]}`);
  if (APPLY) {
    const { error: upErr } = await db
      .from("vehicles")
      .update({ hero_image_url: next })
      .eq("id", car.id)
      .eq("is_demo", true);
    if (upErr) throw upErr;
  }
}
console.log(`${changed} demo car(s) ${APPLY ? "updated" : "would change (dry run — pass --apply)"}.`);
