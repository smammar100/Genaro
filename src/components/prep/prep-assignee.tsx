"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { User } from "@/lib/types";
import { Avatar, Button, Combobox, Popover } from "@/components/genaro";

/**
 * Who is prepping a car: their avatar and name, or "Assign". Either opens a
 * type-ahead rather than a 20-name scroll — the team asked for this shape
 * explicitly (GEN-81): type "sara", press Enter, done. Clearing the field
 * returns the car to Unassigned.
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
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const inputId = useId();

  // Open straight into the search, except on touch, where it would throw the
  // keyboard up. Closing hands focus back to the button.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !window.matchMedia("(pointer: coarse)").matches) {
      requestAnimationFrame(() => document.getElementById(inputId)?.focus());
    }
    if (!open && wasOpen.current) document.getElementById(buttonId)?.focus();
    wasOpen.current = open;
  }, [open, inputId, buttonId]);

  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      sectioned
      activator={
        assignee ? (
          <Button
            id={buttonId}
            variant="tertiary"
            size="micro"
            icon={<Avatar size="xs" name={assignee.name} />}
            accessibilityLabel={`Assigned to ${assignee.name}. Change`}
            ariaExpanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {assignee.name}
          </Button>
        ) : (
          <Button
            id={buttonId}
            variant="tertiary"
            size="micro"
            accessibilityLabel={`Assign ${registration}`}
            ariaExpanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            Assign
          </Button>
        )
      }
    >
      <div className="w-56">
        <Combobox
          id={inputId}
          label={`Assign ${registration}`}
          placeholder="Search staff"
          clearable
          options={users.map((u) => ({
            value: u.id,
            label: u.name,
            media: <Avatar size="xs" name={u.name} />,
          }))}
          value={assignee?.id ?? ""}
          onChange={(id) => {
            onAssign(id || null);
            setOpen(false);
          }}
          emptyState="No one by that name."
        />
      </div>
    </Popover>
  );
}
