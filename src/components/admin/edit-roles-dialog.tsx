"use client";

import { useEffect, useMemo, useState } from "react";
import { Checkbox, Modal } from "@/components/polaris";
import {
  ROLE_DEFS,
  ROLE_GROUPS,
  type RoleValue,
} from "@/lib/roles";
import { teamService } from "@/lib/services/team-service";
import type { User } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/lib/toast";
import { accountHandle } from "@/lib/auth/username";

interface Props {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function EditRolesDialog({ user, open, onOpenChange, onSaved }: Props) {
  const { user: actor } = useAuth();
  const [roles, setRoles] = useState<Set<RoleValue>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Reset state when target user changes / dialog re-opens.
  useEffect(() => {
    if (open && user) {
      // Intentional reset-on-open: re-sync the picker to the target member each
      // time the dialog opens. Owner == super-user, not assignable here, so it
      // is never seeded.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoles(
        new Set((user.roles as RoleValue[]).filter((r) => r !== "owner")),
      );
    }
  }, [open, user]);

  function toggleRole(value: RoleValue) {
    const next = new Set(roles);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setRoles(next);
  }

  // Owner / Super Administrator is a deliberate super-user grant, not
  // assignable from the role editor — exclude it from the picker.
  const assignableRoleDefs = useMemo(
    () => ROLE_DEFS.filter((r) => r.value !== "owner"),
    [],
  );

  async function handleSave() {
    if (!actor || !user) return;
    setSubmitting(true);
    try {
      await teamService.setRoles(user.id, [...roles], actor.id);
      toast.success(`Roles updated for ${user.name}`);
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save roles");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    if (!submitting) onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Edit roles"
      primaryAction={{
        content: "Save changes",
        loading: submitting,
        onAction: () => void handleSave(),
      }}
      secondaryActions={[{ content: "Cancel", onAction: close }]}
    >
      <div className="flex flex-col gap-3">
        {user && (
          <p className="text-sm text-(--text-secondary)">
            Update the role bundle for{" "}
            <strong className="text-(--text)">{user.name}</strong> (
            {accountHandle(user)}).
          </p>
        )}
        <div className="flex flex-col">
          {ROLE_GROUPS.map((group) => {
            const groupRoles = assignableRoleDefs.filter((r) => r.group === group);
            if (groupRoles.length === 0) return null;
            return (
              // shrink-0: keeps each group's rows at their content height so
              // multi-line descriptions never overlap the next role (GEN-41).
              <div key={group} className="flex shrink-0 flex-col">
                {groupRoles.map((r) => (
                  <div
                    key={r.value}
                    className="rounded-md px-3 py-1.5 hover:bg-(--bg-surface-hover)"
                    data-testid={`edit-role-${r.value}`}
                  >
                    <Checkbox
                      label={r.label}
                      helpText={r.description}
                      checked={roles.has(r.value)}
                      onChange={() => toggleRole(r.value)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
