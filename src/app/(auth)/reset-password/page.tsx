"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  rulesResolver,
  newPasswordIssues,
  type FormRules,
} from "@/lib/auth/form-resolver";
import { toast } from "@/lib/toast";
import { useAutoFocusField } from "@/hooks/use-auto-focus";
import { createClient } from "@/lib/supabase/client";
import { Banner, Button } from "@/components/polaris";
import { AuthCard, RhfTextField } from "../_components/auth-card";

interface FormValues {
  password: string;
  confirm: string;
}

const rules: FormRules<FormValues> = (values) => ({
  values,
  issues: newPasswordIssues(values),
});

// Gate: a valid password update requires a recovery session. We only enable the
// form once Supabase confirms one, either via the PASSWORD_RECOVERY auth event
// (cookie/PKCE flow) or an already-present recovery session on mount. Without
// this, a normally-authenticated user could silently change their own password,
// and an expired/invalid link would give no feedback.
type RecoveryStatus = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<RecoveryStatus>("checking");

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    // PASSWORD_RECOVERY fires when the recovery link is exchanged for a session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        settled = true;
        setStatus("ready");
      }
    });

    // Also handle the case where the recovery session is already established by
    // the time we mount (event already fired). Give the event a brief window
    // first, then fall back to "invalid" if no recovery session materialised.
    const timer = setTimeout(() => {
      if (settled) return;
      void supabase.auth.getSession().then(({ data }) => {
        if (settled) return;
        setStatus(data.session ? "ready" : "invalid");
      });
    }, 1200);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const form = useForm<FormValues>({
    resolver: rulesResolver(rules),
    defaultValues: { password: "", confirm: "" },
  });

  // Focus the field on desktop only — see useAutoFocusField.
  useAutoFocusField(form.setFocus, "password");

  async function onSubmit(values: FormValues) {
    if (status !== "ready") return;
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated, you are signed in");
    router.replace("/dashboard");
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a password you haven't used before."
    >
      {status === "invalid" ? (
        <div className="flex flex-col gap-4">
          <Banner tone="critical" title="Reset link invalid or expired">
            This password reset link is no longer valid. Request a new one to
            continue.
          </Banner>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={() => router.replace("/forgot-password")}
          >
            Request a new link
          </Button>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <RhfTextField
            control={form.control}
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
          />
          <RhfTextField
            control={form.control}
            name="confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
          />
          <Button
            variant="primary"
            size="large"
            submit
            fullWidth
            loading={form.formState.isSubmitting}
            disabled={status !== "ready"}
            className="mt-2"
          >
            {status === "checking" ? "Verifying link…" : "Update password"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
