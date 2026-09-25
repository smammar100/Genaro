"use client";

import { useEffect, useState } from "react";
import { Banner, Modal } from "@/components/polaris";
import type { User } from "@/lib/types";
import { toast } from "@/lib/toast";

interface Props {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Admin "reset password" for a member — the no-email equivalent of forgot
 * password. Confirms, calls /api/team/reset-password, then shows the new
 * temporary credential (Username/Email + Password) for out-of-band relay.
 */
export function ResetPasswordDialog({ user, open, onOpenChange }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<{
    username: string | null;
    email: string | null;
    password: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setCreds(null);
    setError(null);
    setSubmitting(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  async function handleReset() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/team/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = (await res.json()) as {
        username?: string | null;
        email?: string | null;
        password?: string;
        error?: string;
      };
      if (!res.ok || !json.password) {
        setError(json.error ?? "Could not reset the password");
        return;
      }
      setCreds({
        username: json.username ?? null,
        email: json.email ?? null,
        password: json.password,
      });
    } catch {
      setError("Could not reset the password");
    } finally {
      setSubmitting(false);
    }
  }

  const handle = creds?.username ?? creds?.email ?? "";
  const handleLabel = creds?.username ? "Username" : "Email";

  async function copyCreds() {
    if (!creds) return;
    try {
      await navigator.clipboard.writeText(
        `${handleLabel}: ${handle}\nPassword: ${creds.password}`,
      );
      toast.success("Credentials copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  function close() {
    if (!submitting) onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reset password"
      size="small"
      primaryAction={
        creds
          ? { content: "Done", onAction: () => onOpenChange(false) }
          : {
              content: "Reset password",
              loading: submitting,
              onAction: () => void handleReset(),
            }
      }
      secondaryActions={
        creds
          ? [{ content: "Copy credentials", onAction: () => void copyCreds() }]
          : [{ content: "Cancel", onAction: close }]
      }
    >
      {creds ? (
        <div data-testid="reset-password-creds">
          <Banner tone="success" title="New password set, relay these">
            <div className="grid gap-1 font-mono text-xs">
              <div>
                <span className="text-(--text-secondary)">{handleLabel}: </span>
                {handle}
              </div>
              <div>
                <span className="text-(--text-secondary)">Password: </span>
                {creds.password}
              </div>
            </div>
          </Banner>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {user && (
            <p className="text-sm text-(--text-secondary)">
              Generate a new temporary password for{" "}
              <strong className="text-(--text)">{user.name}</strong>.
              They&apos;ll be forced to set their own on next login. Relay it
              out-of-band (WhatsApp / phone / in person).
            </p>
          )}
          {error && <Banner tone="critical">{error}</Banner>}
        </div>
      )}
    </Modal>
  );
}
