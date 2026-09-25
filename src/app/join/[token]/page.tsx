"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  rulesResolver,
  emailIssue,
  newPasswordIssues,
  type FormRules,
} from "@/lib/auth/form-resolver";
import { toast } from "@/lib/toast";
import { useAutoFocusField } from "@/hooks/use-auto-focus";
import { Button } from "@/components/polaris";
import { AuthCard, RhfTextField } from "@/app/(auth)/_components/auth-card";

interface FormValues {
  name?: string;
  email: string;
  password: string;
  confirm: string;
}

const rules: FormRules<FormValues> = (values) => ({
  values: { ...values, name: values.name?.trim() },
  issues: [
    ...emailIssue<FormValues>("email", values.email),
    ...newPasswordIssues(values),
  ],
});

/**
 * Public magic-link join page. The token in the URL maps server-side to a
 * company; the visitor sets their own email + password and lands in that
 * company with the link's default role. No email round-trip.
 */
export default function JoinPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: rulesResolver(rules),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  // Focus the field on desktop only — see useAutoFocusField. Targets "email"
  // rather than the first field, matching the previous autoFocus placement.
  useAutoFocusField(form.setFocus, "email");

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/team/accept-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: values.email,
          password: values.password,
          name: values.name,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Could not complete sign-up");
        return;
      }
      setDone(true);
      toast.success("Account created, you can now sign in");
      setTimeout(() => router.replace("/login"), 1200);
    } catch {
      toast.error("Could not complete sign-up");
    }
  }

  return (
    <AuthCard
      centered
      title="Join the team"
      subtitle="Set your details to create your account."
    >
      {done ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="heading-sm text-(--text)">You&apos;re all set</p>
          <p className="body-md text-(--text-secondary)">
            Redirecting you to sign in…
          </p>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <RhfTextField
            control={form.control}
            name="name"
            label="Name (optional)"
            autoComplete="name"
            placeholder="Jane Smith"
          />
          <RhfTextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
          />
          <RhfTextField
            control={form.control}
            name="password"
            label="Password"
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
            Create account
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
