"use client";

import { useEffect } from "react";
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
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/polaris";
import { AuthCard, RhfTextField } from "../_components/auth-card";

interface FormValues {
  password: string;
  confirm: string;
}

const rules: FormRules<FormValues> = (values) => ({
  values,
  issues: newPasswordIssues(values),
});

/**
 * SPEC Point 2 — forced first-login password change for directly-created
 * users. The (dashboard) layout redirects here while
 * `user.passwordResetRequired` is true; on success we clear the flag and
 * the gate lets them through.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const { user, loading, revalidate } = useAuth();

  // Already activated (or arrived without needing it) → no reason to be here.
  useEffect(() => {
    if (!loading && user && !user.passwordResetRequired) {
      router.replace("/dashboard");
    }
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const form = useForm<FormValues>({
    resolver: rulesResolver(rules),
    defaultValues: { password: "", confirm: "" },
  });

  // Focus the field on desktop only — see useAutoFocusField.
  useAutoFocusField(form.setFocus, "password");

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (user) {
      // Clear the forced-reset flag + stamp activation. The existing
      // company-scoped RLS on public.users permits a member to update
      // their own row (same path teamService.acceptInvitation uses).
      await supabase
        .from("users")
        .update({
          password_reset_required: false,
          activated_at: new Date().toISOString(),
        } as never)
        .eq("id", user.id);
      await revalidate({ force: true });
    }
    toast.success("Password set, welcome");
    router.replace("/dashboard");
  }

  return (
    <AuthCard
      title="Welcome, set your password"
      subtitle="Choose your own password to continue to the dashboard."
    >
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
          className="mt-2"
        >
          Set password
        </Button>
      </form>
    </AuthCard>
  );
}
