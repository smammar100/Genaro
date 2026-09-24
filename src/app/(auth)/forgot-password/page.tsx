"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
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
    <div className="flex min-h-screen items-center justify-center bg-[#f1f1f1] px-4 py-12 dark:bg-background">
      <div className="w-full max-w-[400px] rounded-xl border border-[#e3e3e3] bg-white p-8 shadow-[0_1px_0_rgba(0,0,0,.05)] dark:bg-card">
        <div className="mb-6">
          <div className="mb-6 grid size-9 place-items-center rounded-lg bg-[#101010] text-xs font-bold text-white">
            CC
          </div>
          <h1 className="text-xl font-semibold text-[#101010] dark:text-foreground">
            Reset password
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            We&apos;ll email you a link to choose a new password.
          </p>
        </div>

        <Card className="gap-0 border-0 bg-transparent p-0 shadow-none ring-0">
          {sent ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                If an account exists for that email, the reset link is on its
                way. Open the link from the same device.
              </p>
              <Link
                href="/login"
                className="text-sm font-medium text-[#005bd3] underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="you@carcapital.uk"
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
                  {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
                </Button>
                <Link
                  href="/login"
                  className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Back to sign in
                </Link>
              </form>
            </Form>
          )}
        </Card>
      </div>
    </div>
  );
}
