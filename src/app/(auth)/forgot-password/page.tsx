"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { rulesResolver, emailIssue, type FormRules } from "@/lib/auth/form-resolver";
import { toast } from "@/lib/toast";
import { useAutoFocusField } from "@/hooks/use-auto-focus";
import { createClient } from "@/lib/supabase/client";
import { Button, Link } from "@/components/polaris";
import { AuthCard, RhfTextField } from "../_components/auth-card";

interface FormValues {
  email: string;
}

const rules: FormRules<FormValues> = (values) => ({
  values,
  issues: emailIssue<FormValues>("email", values.email),
});

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: rulesResolver(rules),
    defaultValues: { email: "" },
  });

  // Focus the field on desktop only — see useAutoFocusField.
  useAutoFocusField(form.setFocus, "email", !sent);

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
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
            If an account exists for that email, the reset link is on its
            way. Open the link from the same device.
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
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
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
