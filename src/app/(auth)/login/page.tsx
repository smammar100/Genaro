"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Banner, Button, Link } from "@/components/polaris";
import { AuthCard, RhfTextField } from "../_components/auth-card";

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
    // Polaris sign-in: one centred Card on the bg page ground.
    <AuthCard title="Log in" subtitle="Continue to Car Capital UK">
      {/* A deactivated account is signed out mid-session, which without
          this reads as "my password stopped working" (GEN-125). Name the
          cause and the person who can undo it. */}
      {signedOutReason === "deactivated" && (
        <Banner tone="warning" className="mb-2">
          This account has been deactivated. Ask an administrator to restore
          your access.
        </Banner>
      )}

      <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
        <RhfTextField
          control={form.control}
          name="identifier"
          label="Username or email"
          type="text"
          autoComplete="username"
          placeholder="username"
        />
        <RhfTextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <Button
          variant="primary"
          size="large"
          submit
          fullWidth
          loading={form.formState.isSubmitting}
          className="mt-1"
        >
          Sign in
        </Button>
        <div className="self-center">
          <Link url="/forgot-password" removeUnderline>
            Forgot password?
          </Link>
        </div>
      </form>

      {process.env.NODE_ENV !== "production" && (
        <p className="body-sm mt-8 text-(--text-secondary)">
          Dev seed users: shared password{" "}
          <code className="rounded-(--radius-100) bg-(--bg-surface-secondary) px-1.5 py-0.5 text-(--text)">
            CarCapUAT!2026
          </code>
          .
        </p>
      )}
    </AuthCard>
  );
}
