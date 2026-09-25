"use client";

import {
  ALL_CAPABILITIES,
  CAPABILITY_GROUPS,
  CAPABILITY_LABELS,
  type Capability,
  type CapabilityGroup,
} from "@/lib/capabilities";
import { capabilitiesForRoles } from "@/lib/roles";
import { Trash2, SlidersHorizontal, KeyRound } from "lucide-react";
import { Avatar, Badge } from "@/components/polaris";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";
import { accountHandle } from "@/lib/auth/username";
import type { User, UUID } from "@/lib/types";
import { PermissionCell } from "./permission-cell";
import type { PermissionsMap } from "./types";

interface Props {
  users: User[];
  /** Visible capability groups (drives the grouped two-row header). */
  groups?: CapabilityGroup[];
  localState: PermissionsMap;
  serverState: PermissionsMap;
  currentUserId?: UUID;
  onToggle: (userId: UUID, cap: Capability) => void;
  onRemove?: (user: User) => void;
  onEditRoles?: (user: User) => void;
  onResetPassword?: (user: User) => void;
}

const MEMBER_COL_W = 248;
const CAP_COL_W = 92;

// Solid backgrounds on sticky cells — translucency lets scrolled-out content
// bleed through (same fix as the Master Sheet). Shadow marks the frozen edge.
const STICKY_SHADOW = "shadow-[2px_0_4px_-2px_var(--border-secondary)]";

// Row actions stay on the app Button: the Polaris Button has no
// data-testid / title props, which these rely on.
const ROW_ACTION =
  "text-(--icon-secondary) hover:bg-(--bg-surface-hover) hover:text-(--icon)";

export function PermissionsGridTable({
  users,
  groups = CAPABILITY_GROUPS,
  localState,
  serverState,
  currentUserId,
  onToggle,
  onRemove,
  onEditRoles,
  onResetPassword,
}: Props) {
  // Columns flattened in group order (keeps related capabilities adjacent).
  const caps = groups.flatMap((g) => g.capabilities);

  return (
    <div className="relative max-h-[calc(100dvh-17rem)] min-h-80 overflow-auto">
      <table
        className="w-max border-separate text-xs"
        style={{ borderSpacing: 0 }}
      >
        <colgroup>
          <col style={{ width: MEMBER_COL_W }} />
          {caps.map((cap) => (
            <col key={cap} style={{ width: CAP_COL_W }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-(--bg-surface-secondary)">
          <tr>
            <th
              className={cn(
                "sticky left-0 z-30 border-b border-r border-(--border) bg-(--bg-surface-secondary) px-4 text-left",
                STICKY_SHADOW,
              )}
            >
              <span
                className="text-xs font-medium text-(--text-secondary)"
                data-testid="member-count"
              >
                {users.length} member{users.length === 1 ? "" : "s"}
              </span>
            </th>
            {caps.map((cap) => (
              <th
                key={cap}
                className="border-b border-l border-(--border) bg-(--bg-surface-secondary) px-1.5 py-1.5 text-center align-middle"
              >
                <span
                  className="line-clamp-2 text-center text-xs font-medium leading-snug text-(--text-secondary)"
                  title={CAPABILITY_LABELS[cap]}
                >
                  {CAPABILITY_LABELS[cap]}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className="bg-(--bg-surface)"
          data-testid="permissions-grid-body"
        >
          {users.map((u) => {
            const local = localState.get(u.id) ?? new Set<Capability>();
            const server = serverState.get(u.id) ?? new Set<Capability>();
            const roleCaps = capabilitiesForRoles(u.roles);
            const isYou = currentUserId === u.id;
            const granted = u.isSuperUser ? ALL_CAPABILITIES.length : local.size;
            const editable = !isYou && !u.isSuperUser;
            return (
              <tr
                key={u.id}
                className="group/row"
                data-testid={`permissions-grid-row-${u.id}`}
              >
                <td
                  className={cn(
                    "sticky left-0 z-10 border-b border-r border-(--border) bg-(--bg-surface) px-3",
                    "group-hover/row:bg-(--bg-surface-hover)",
                    STICKY_SHADOW,
                  )}
                >
                  <div className="group/member flex h-12 items-center gap-2">
                    <Avatar
                      name={u.name}
                      initials={getInitials(u.name)}
                      size="md"
                    />
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-(--text)">
                          {u.name}
                        </span>
                        {isYou && <Badge>You</Badge>}
                        {u.isSuperUser && (
                          <Badge tone="info">Super user</Badge>
                        )}
                      </div>
                      <span className="truncate text-xs text-(--text-secondary)">
                        {accountHandle(u)}
                      </span>
                    </div>
                    <Badge
                      className={cn(
                        "ml-auto shrink-0 tabular-nums",
                        "group-focus-within/member:hidden group-hover/member:hidden",
                      )}
                    >
                      {granted}/{ALL_CAPABILITIES.length}
                    </Badge>
                    <div
                      className={cn(
                        "ml-auto hidden shrink-0 items-center gap-0.5",
                        "group-focus-within/member:flex group-hover/member:flex",
                      )}
                    >
                      {onEditRoles && editable && (
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          onClick={() => onEditRoles(u)}
                          className={ROW_ACTION}
                          aria-label={`Edit roles for ${u.name}`}
                          title="Edit roles"
                          data-testid={`edit-roles-${u.id}`}
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                      )}
                      {onResetPassword && editable && (
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          onClick={() => onResetPassword(u)}
                          className={ROW_ACTION}
                          aria-label={`Reset password for ${u.name}`}
                          title="Reset password"
                          data-testid={`reset-password-${u.id}`}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
                      {onRemove && editable && (
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          onClick={() => onRemove(u)}
                          className="text-(--icon-secondary) hover:bg-(--bg-surface-critical) hover:text-(--icon-critical)"
                          aria-label={`Remove ${u.name}`}
                          title="Remove member"
                          data-testid={`remove-member-${u.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </td>
                {caps.map((cap) => {
                  const checked = local.has(cap);
                  const roleGranted = roleCaps.has(cap);
                  const changed =
                    !u.isSuperUser && !roleGranted && checked !== server.has(cap);
                  return (
                    <PermissionCell
                      key={cap}
                      userId={u.id}
                      capability={cap}
                      checked={checked}
                      superUser={u.isSuperUser}
                      roleGranted={roleGranted}
                      changed={changed}
                      onToggle={onToggle}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
