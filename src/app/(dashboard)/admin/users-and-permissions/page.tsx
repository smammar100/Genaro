"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldX } from "lucide-react";
import { Card, EmptyState, Page } from "@/components/polaris";
import { usePermissions } from "@/hooks/use-permissions";
import { AddStaffDialog } from "@/components/admin/add-staff-dialog";
import {
  PermissionsGrid,
  type PermissionsGridHandle,
} from "@/components/admin/permissions-grid";

export default function TeamAndSecurityPage() {
  const { can, isSuperUser, isLoading } = usePermissions();
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const gridRef = useRef<PermissionsGridHandle>(null);

  const canManage =
    isSuperUser ||
    can("admin:manage_users") ||
    can("admin:manage_permissions");
  const noAccess = !isLoading && !canManage;

  // The role-based "Invite Member" CTA (IAM Admin / Owner) navigates here with
  // ?invite=1 — auto-open the invite dialog so the CTA lands in the flow.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("invite") === "1" && canManage) setAddStaffOpen(true);
  }, [searchParams, canManage]);

  return (
    <Page
      title="Users and permissions"
      subtitle="Manage who is on your team and exactly what each person can access."
      fullWidth
      // "Invite by email" is hidden for now — username accounts are the live
      // flow. Restore it + InviteMemberDialog from git history to re-enable.
      primaryAction={
        noAccess
          ? undefined
          : { content: "Add staff member", onAction: () => setAddStaffOpen(true) }
      }
    >
      {noAccess ? (
        <Card>
          <EmptyState icon={<ShieldX />} heading="You don't have access">
            Managing team permissions requires the Manage permissions
            capability.
          </EmptyState>
        </Card>
      ) : (
        <PermissionsGrid ref={gridRef} />
      )}

      <AddStaffDialog
        open={addStaffOpen}
        onOpenChange={setAddStaffOpen}
        onCreated={() => void gridRef.current?.reload()}
      />
    </Page>
  );
}
