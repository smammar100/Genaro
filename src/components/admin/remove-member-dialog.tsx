"use client";

import { useState } from "react";
import { Modal } from "@/components/polaris";
import { teamService } from "@/lib/services/team-service";
import type { User } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/lib/toast";
import { accountHandle } from "@/lib/auth/username";

interface Props {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: () => void;
}

export function RemoveMemberDialog({ user, open, onOpenChange, onRemoved }: Props) {
  const { user: actor } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!actor || !user) return;
    setSubmitting(true);
    try {
      await teamService.removeMember(user.id, actor.id);
      toast.success(`${user.name} removed from the team`);
      onRemoved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove member");
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
      title="Remove team member?"
      size="small"
      primaryAction={{
        content: "Remove member",
        destructive: true,
        loading: submitting,
        onAction: () => void handleConfirm(),
      }}
      secondaryActions={[{ content: "Cancel", onAction: close }]}
    >
      <div
        className="flex flex-col gap-2 text-sm text-(--text)"
        data-testid="remove-member-dialog"
      >
        {user ? (
          <p>
            <strong>{user.name}</strong> ({accountHandle(user)}) will lose
            access to Car Capital UK immediately. This action cannot be undone.
          </p>
        ) : null}
        <ul className="list-disc pl-5 text-xs text-(--text-secondary)">
          <li>Their session is invalidated on next request.</li>
          <li>Audit-log entries authored by them remain for the record.</li>
          <li>Re-add later by sending a fresh invitation.</li>
        </ul>
      </div>
    </Modal>
  );
}
