"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { authService } from "@/lib/services/auth-service";
import type { User } from "@/lib/types";

/**
 * Profile pictures for the team (0068): pass a person's id (or, failing
 * that, their name) and get the picture to give an Avatar's `source`, or
 * undefined for initials. The team list is cached and shared, so every
 * avatar on a page asks once; your own picture comes from your session, so
 * a new one shows at once.
 */
export function useTeamPictures(): (person: string | null | undefined) => string | undefined {
  const { user, company } = useAuth();
  const [team, setTeam] = useState<User[]>([]);
  useEffect(() => {
    if (!company?.id) return;
    let active = true;
    authService
      .getUsersForCompany(company.id)
      .then((list) => {
        if (active) setTeam(list);
      })
      .catch(() => {
        // Offline or blocked: initials everywhere, as before.
      });
    return () => {
      active = false;
    };
  }, [company?.id]);

  return (person) => {
    if (!person) return undefined;
    if (user && (person === user.id || person === user.name)) return user.avatarUrl ?? undefined;
    const match = team.find((u) => u.id === person) ?? team.find((u) => u.name === person);
    return match?.avatarUrl ?? undefined;
  };
}
