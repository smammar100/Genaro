import { redirect } from "next/navigation";

/**
 * Locations merged into All vehicles, which has a tab per place and a Move
 * button on each row (call 2026-10-31). Old links land on the same tab.
 */
export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  redirect(tab ? `/vehicles?tab=${encodeURIComponent(tab)}` : "/vehicles");
}
