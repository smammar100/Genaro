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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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
    <div className="flex min-h-screen items-center justify-center bg-[#f1f1f1] px-4 py-12 dark:bg-background">
      <div className="w-full max-w-[400px] rounded-xl border border-[#e3e3e3] bg-white p-8 shadow-[0_1px_0_rgba(0,0,0,.05)] dark:bg-card">
        <div className="mb-6">
          <div className="mb-6 grid size-9 place-items-center rounded-lg bg-[#101010] text-xs font-bold text-white">
            CC
          </div>
          <h1 className="text-xl font-semibold text-[#101010] dark:text-foreground">
            Set a new password
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Choose a password you haven&apos;t used before.
          </p>
        </div>

        {status === "invalid" ? (
          <Card className="gap-0 border-0 bg-transparent p-0 shadow-none ring-0">
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-base font-semibold">
                Reset link invalid or expired
              </h2>
              <p className="text-sm text-muted-foreground">
                This password reset link is no longer valid. Request a new one to
                continue.
              </p>
              <Button
                type="button"
                onClick={() => router.replace("/forgot-password")}
              >
                Request a new link
              </Button>
            </div>
          </Card>
        ) : (
        <Card className="gap-0 border-0 bg-transparent p-0 shadow-none ring-0">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="mt-2"
                disabled={
                  form.formState.isSubmitting || status !== "ready"
                }
              >
                {status === "checking"
                  ? "Verifying link…"
                  : form.formState.isSubmitting
                    ? "Updating…"
                    : "Update password"}
              </Button>
            </form>
          </Form>
        </Card>
        )}
      </div>
    </div>
  );
}
