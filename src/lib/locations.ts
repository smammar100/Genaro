import {
  VEHICLE_LOCATION_LABELS,
  isCustomLocation,
  type CompanyLocation,
  type CurrentLocation,
} from "@/lib/types";

/** The company's places as last loaded, for names drawn outside React. */
let remembered: CompanyLocation[] = [];

/** Called by useCompanyLocations whenever it loads the list. */
export function rememberCompanyLocations(list: CompanyLocation[]): void {
  remembered = list;
}

/**
 * A location's name: a built-in one's own, or the company's name for a place
 * it added. A removed place keeps its name; one this list doesn't know (still
 * loading, or another company's) reads as "Other location".
 */
export function locationLabel(
  location: CurrentLocation,
  custom: CompanyLocation[] = remembered,
): string {
  if (!isCustomLocation(location)) return VEHICLE_LOCATION_LABELS[location];
  return custom.find((l) => l.slug === location)?.label ?? "Other location";
}

/** The company's places still in use, in their order. */
export const liveLocations = (custom: CompanyLocation[]): CompanyLocation[] =>
  custom.filter((l) => !l.archivedAt);
