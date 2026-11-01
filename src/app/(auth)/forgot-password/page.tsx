"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { rulesResolver, requiredIssue, type FormRules } from "@/lib/auth/form-resolver";
import { toast } from "@/lib/toast";
import { useAutoFocusField } from "@/hooks/use-auto-focus";
import { Button, Link } from "@/components/genaro";
import { AuthCard, RhfTextField } from "../_components/auth-card";

interface FormValues {
  identifier: string;
}

const rules: FormRules<FormValues> = (values) => ({
  values,
  issues: requiredIssue<FormValues>("identifier", values.identifier, "Enter your username or email"),
});

/**
 * Forgot password: a username or an email, as at sign-in (call 2026-10-31).
 * The server sends the link to the account's email, or for a username
 * account to the email set on My profile.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: rulesResolver(rules),
    defaultValues: { identifier: "" },
  });

  // Focus the field on desktop only — see useAutoFocusField.
  useAutoFocusField(form.setFocus, "identifier", !sent);

  async function onSubmit(values: FormValues) {
    // The dealership for a username, as the sign-in page reads it.
    const org = new URLSearchParams(window.location.search).get("org") ?? undefined;
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: values.identifier, org }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(json.error ?? "Couldn't send the link. Try again.");
      return;
    }
    setSent(true);
    toast.success("Check your inbox");
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="We'll email you a link to choose a new password."
    >
      {sent ? (
        <div className="flex flex-col gap-3">
          <p className="body-md text-(--text)">
            If that account has an email for resets, the link is on its way.
            It works once, for an hour.
          </p>
          <p className="body-md text-(--text-secondary)">
            Nothing after a few minutes? If you sign in with a username and
            haven&apos;t saved an email on My profile, ask your manager to reset
            your password in Users &amp; permissions.
          </p>
          <div>
            <Link url="/login">Back to sign in</Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <RhfTextField
            control={form.control}
            name="identifier"
            label="Username or email"
            autoComplete="username"
            placeholder="username"
          />
          <Button
            variant="primary"
            size="large"
            submit
            fullWidth
            loading={form.formState.isSubmitting}
            className="mt-2"
          >
            Send reset link
          </Button>
          <div className="self-center">
            <Link url="/login" removeUnderline>
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
