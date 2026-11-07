"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { companyLocationService } from "@/lib/services/company-location-service";
import { VEHICLE_LOCATIONS, type BuiltInLocation, type CompanyLocation } from "@/lib/types";
import { rememberCompanyLocations } from "@/lib/locations";

/**
 * The company's own places (0056), removed ones included so history still
 * names them. Empty until loaded; the read is cached and shared, so every
 * badge on a page asks once.
 */
export function useCompanyLocations(): CompanyLocation[] {
  const { company } = useAuth();
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  useEffect(() => {
    if (!company?.id) return;
    let active = true;
    companyLocationService
      .getAll(company.id)
      .then((list) => {
        rememberCompanyLocations(list);
        if (active) setLocations(list);
      })
      .catch(() => {
        // Before 0056 is applied, or offline: the built-in places still work.
      });
    return () => {
      active = false;
    };
  }, [company?.id]);
  return locations;
}

/**
 * The built-in places still in use, in their order: the ones the company
 * removed in Settings → Locations (0066) are left out. All five until loaded,
 * and before 0066 is applied.
 */
export function useBuiltInLocations(): BuiltInLocation[] {
  const { company } = useAuth();
  const [hidden, setHidden] = useState<BuiltInLocation[]>([]);
  useEffect(() => {
    if (!company?.id) return;
    let active = true;
    companyLocationService
      .getHidden(company.id)
      .then((list) => {
        if (active) setHidden(list);
      })
      .catch(() => {
        // Offline or blocked: offer every built-in place, as before 0066.
      });
    return () => {
      active = false;
    };
  }, [company?.id]);
  return VEHICLE_LOCATIONS.filter((l) => !hidden.includes(l));
}
