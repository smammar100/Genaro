"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import { useAutoFocusField } from "@/hooks/use-auto-focus";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
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

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be 72 characters or fewer"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

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
    resolver: zodResolver(schema),
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
    <div className="flex min-h-screen items-center justify-center bg-[#f1f1f1] px-4 py-12 dark:bg-background">
      <div className="w-full max-w-[400px] rounded-xl border border-[#e3e3e3] bg-white p-8 shadow-[0_1px_0_rgba(0,0,0,.05)] dark:bg-card">
        <div className="mb-6">
          <div className="mb-6 grid size-9 place-items-center rounded-lg bg-[#101010] text-xs font-bold text-white">
            CC
          </div>
          <h1 className="text-xl font-semibold text-[#101010] dark:text-foreground">
            Welcome, set your password
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Choose your own password to continue to the dashboard.
          </p>
        </div>

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
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Saving…" : "Set password"}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
