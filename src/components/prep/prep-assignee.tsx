"use client";

import type { User } from "@/lib/types";
import { Avatar, Combobox } from "@/components/genaro";

/**
 * Who is prepping a car. A type-ahead rather than a 20-name scroll — the team
 * asked for this shape explicitly (GEN-81): type "sara", press Enter, done.
 * Clearing the field returns the car to Unassigned.
 */
export function PrepAssignee({
  registration,
  users,
  assignee,
  onAssign,
}: {
  registration: string;
  users: User[];
  assignee: User | null;
  onAssign: (userId: string | null) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <div className="min-w-0 flex-1">
        <Combobox
          label={`Assign ${registration}`}
          labelHidden
          placeholder="Unassigned"
          clearable
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          value={assignee?.id ?? ""}
          onChange={(id) => onAssign(id || null)}
          emptyState="No one by that name."
        />
      </div>
      {assignee ? (
        <span title={assignee.name} className="inline-flex shrink-0">
          <Avatar size="sm" name={assignee.name} />
        </span>
      ) : null}
    </div>
  );
}
