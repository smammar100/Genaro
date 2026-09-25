"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { rulesResolver, requiredIssue, type FormRules } from "@/lib/auth/form-resolver";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/auth-context";
import { getHomeForUser } from "@/lib/user-home";
import {
  looksLikeEmail,
  syntheticEmail,
  DEFAULT_ORG_SLUG,
} from "@/lib/auth/username";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/forms/input-field";

interface FormValues {
  identifier: string;
  password: string;
}

const rules: FormRules<FormValues> = (values) => ({
  values,
  issues: [
    ...requiredIssue<FormValues>(
      "identifier",
      values.identifier,
      "Enter your username or email",
    ),
    ...requiredIssue<FormValues>("password", values.password, "Password is required"),
  ],
});

export default function LoginPage() {
  // useSearchParams must be inside a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { user, signIn, signOut } = useAuth();
  const explicitNext = search.get("next");
  // Set when hydrate() signs out an inactive profile, so the bounce back here
  // carries an explanation instead of looking like a failed password.
  const signedOutReason = search.get("reason");
  // Dealership for username logins (scopes the internal synthetic email). From
  // ?org=<slug>, else the default single dealership. Email logins ignore this.
  const orgSlug = search.get("org") ?? DEFAULT_ORG_SLUG;

  const form = useForm<FormValues>({
    resolver: rulesResolver(rules),
    defaultValues: { identifier: "", password: "" },
  });

  const justSubmittedRef = useRef(false);
  const clearedRef = useRef(false);

  // Landing on /login means "I want to authenticate." If a PRE-EXISTING session
  // is present (e.g. switching accounts), sign it out ONCE so the form is usable
  // and the next sign-in starts clean — never auto-redirect a logged-in user
  // away (that bounced account-switchers back as the old user).
  //
  // CRITICAL: skip when the session is one our own onSubmit just created
  // (justSubmittedRef) — otherwise this signs the freshly-logged-in user right
  // back out. Guarded by clearedRef so it fires at most once per visit.
  useEffect(() => {
    if (clearedRef.current || justSubmittedRef.current) return;
    if (user) {
      clearedRef.current = true;
      void signOut();
    }
  }, [user, signOut]);

  // After a successful sign-in, `user` hydrates → route to the role's home
  // (or the explicit ?next= deep-link if one was provided).
  useEffect(() => {
    if (justSubmittedRef.current && user) {
      router.replace(explicitNext ?? getHomeForUser(user));
    }
  }, [user, explicitNext, router]);

  async function onSubmit(values: FormValues) {
    try {
      justSubmittedRef.current = true;
      // No "@" → treat as a username and map to the dealership's internal
      // synthetic email; otherwise sign in with the email directly.
      const email = looksLikeEmail(values.identifier)
        ? values.identifier.trim().toLowerCase()
        : syntheticEmail(orgSlug, values.identifier);
      await signIn(email, values.password);
      toast.success("Signed in");
      // The effect above performs the redirect once `user` hydrates.
    } catch (err) {
      justSubmittedRef.current = false;
      const msg = err instanceof Error ? err.message : "Could not sign in";
      toast.error(msg);
      form.setError("password", { message: " " });
    }
  }

  // form.handleSubmit wraps onSubmit, which reads submission-guard refs — a
  // standard RHF + ref pattern the react-hooks/refs rule over-flags.
  // eslint-disable-next-line react-hooks/refs
  const handleFormSubmit = form.handleSubmit(onSubmit);

  return (
    // Shopify-style sign-in: one centred white card on a #f1f1f1 page.
    <div className="flex min-h-screen items-center justify-center bg-[#f1f1f1] px-4 py-12 dark:bg-background">
      <div className="w-full max-w-[400px] rounded-xl border border-[#e3e3e3] bg-white p-8 shadow-[0_1px_0_rgba(0,0,0,.05)] dark:bg-card">
          <div className="mb-6 grid size-9 place-items-center rounded-lg bg-[#101010] text-xs font-bold text-white">
            CC
          </div>
          <h1 className="text-xl font-semibold text-[#101010] dark:text-foreground">
            Log in
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Continue to Car Capital UK
          </p>

          {/* A deactivated account is signed out mid-session, which without
              this reads as "my password stopped working" (GEN-125). Name the
              cause and the person who can undo it. */}
          {signedOutReason === "deactivated" && (
            <div
              role="status"
              className="mt-5 rounded-lg bg-[#fff1c2] px-3 py-2.5 text-left text-[13px] text-[#4f4700] dark:bg-amber-950/30 dark:text-amber-200"
            >
              This account has been deactivated. Ask an administrator to restore
              your access.
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="mt-6 flex flex-col gap-4">
            <InputField
              control={form.control}
              name="identifier"
              label="Username or email"
              type="text"
              autoComplete="username"
              placeholder="username"
            />
            <InputField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              expand
              loading={form.formState.isSubmitting}
              className="mt-1"
            >
              Sign in
            </Button>
            <Link
              href="/forgot-password"
              className="self-center text-[13px] text-[#005bd3] underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </form>

          {process.env.NODE_ENV !== "production" && (
            <p className="mt-8 text-xs text-muted-foreground">
              Dev seed users: shared password{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                CarCapUAT!2026
              </code>
              .
            </p>
          )}
      </div>
    </div>
  );
}
