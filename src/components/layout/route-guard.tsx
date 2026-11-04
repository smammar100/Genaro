"use client";

import { usePathname } from "next/navigation";
import { EmptyState, EmptyStateIllustration } from "@/components/genaro";
import { usePermissions } from "@/hooks/use-permissions";
import { requiredCapsForPath } from "./sidebar-config";

/**
 * Central capability guard for every dashboard page. Resolves the current
 * path's required capabilities (the same map the sidebar uses) and renders
 * the page only if the user qualifies — otherwise shows the "Access
 * restricted" empty state. Blocked pages never mount, so their data hooks
 * don't run. Open routes (e.g. /dashboard) render straight through.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can, isSuperUser, isLoading } = usePermissions();
  const caps = requiredCapsForPath(pathname ?? "");

  if (!caps || caps.length === 0) return <>{children}</>;
  if (isSuperUser) return <>{children}</>;
  if (isLoading) return null; // wait for capabilities before deciding
  if (caps.some(can)) return <>{children}</>;

  return (
    <EmptyState illustration={<EmptyStateIllustration variant="lock" />} heading="Access restricted">
      You don&apos;t have permission to view this page. Ask an administrator to grant access in Users &amp; permissions.
    </EmptyState>
  );
}
