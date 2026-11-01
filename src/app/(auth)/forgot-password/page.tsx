"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { rulesResolver, requiredIssue, type FormRules } from "@/lib/auth/form-resolver";
import { looksLikeEmail } from "@/lib/auth/username";
import { toast } from "@/lib/toast";
import { useAutoFocusField } from "@/hooks/use-auto-focus";
import { Button, Link } from "@/components/genaro";
import { AuthCard, RhfTextField } from "../_components/auth-card";

// Loaded on submit, not with the page: the Supabase client is the largest
// library here and the form paints without it.
const getSupabase = () => import("@/lib/supabase/client").then((m) => m.createClient());

interface FormValues {
  identifier: string;
}

const rules: FormRules<FormValues> = (values) => ({
  values,
  issues: requiredIssue<FormValues>("identifier", values.identifier, "Enter your username or email"),
});

/**
 * Forgot password: a username or an email, as at sign-in (call 2026-10-31).
 * An email gets Supabase's own reset email, whose link opens /reset-password.
 * A username account's sign-in email is internal and receives no mail
 * (lib/auth/username), so it is told to ask its manager, who resets it in
 * Users & permissions.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState<"email" | "username" | null>(null);

  const form = useForm<FormValues>({
    resolver: rulesResolver(rules),
    defaultValues: { identifier: "" },
  });

  // Focus the field on desktop only — see useAutoFocusField.
  useAutoFocusField(form.setFocus, "identifier", sent === null);

  async function onSubmit(values: FormValues) {
    if (!looksLikeEmail(values.identifier)) {
      setSent("username");
      return;
    }
    const supabase = await getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(
      values.identifier.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent("email");
    toast.success("Check your inbox");
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="We'll email you a link to choose a new password."
    >
      {sent ? (
        <div className="flex flex-col gap-3">
          {sent === "email" ? (
            <p className="body-md text-(--text)">
              If an account exists for that email, the reset link is on its
              way. Open the link on this device.
            </p>
          ) : (
            <p className="body-md text-(--text)">
              Accounts that sign in with a username can&apos;t get reset emails.
              Ask your manager to reset your password in Users &amp;
              permissions.
            </p>
          )}
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
            placeholder="you@carcapital.uk"
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
