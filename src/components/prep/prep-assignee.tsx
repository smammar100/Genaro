"use client";

import type { User } from "@/lib/types";
import { Avatar } from "@/components/polaris";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";

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
      <Combobox
        items={users}
        value={assignee}
        onValueChange={(u: User | null) => onAssign(u?.id ?? null)}
        itemToStringLabel={(u: User) => u.name}
        // Without this the top match isn't highlighted and Enter does nothing.
        autoHighlight
      >
        <ComboboxInput
          size="sm"
          showClear={assignee !== null}
          placeholder="Unassigned"
          aria-label={`Assign ${registration}`}
          className="w-full flex-1"
        />
        <ComboboxPopup>
          <ComboboxEmpty>No one by that name.</ComboboxEmpty>
          <ComboboxList>
            {(u: User) => (
              <ComboboxItem key={u.id} value={u}>
                {u.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
      {assignee ? (
        <span title={assignee.name} className="inline-flex shrink-0">
          <Avatar size="sm" name={assignee.name} />
        </span>
      ) : null}
    </div>
  );
}
