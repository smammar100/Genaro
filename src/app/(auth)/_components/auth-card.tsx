"use client";

import * as React from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Card, TextField, type TextFieldProps } from "@/components/polaris";

/**
 * The Polaris sign-in layout shared by the auth pages (log in, reset, set
 * password) and the public join page: one centred Card on the `bg` page
 * ground, the brand mark, a heading-lg title and a body-md subtitle.
 */
export function AuthCard({
  title,
  subtitle,
  centered,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** Centre the header (the join page). */
  centered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--bg) px-4 py-12">
      <Card className="w-full max-w-[400px] gap-0 p-8">
        <div className={centered ? "mb-6 text-center" : "mb-6"}>
          <div
            className={
              "mb-6 grid size-9 place-items-center rounded-(--radius-200) bg-(--bg-fill-brand) text-xs font-bold text-(--text-brand-on-bg-fill)" +
              (centered ? " mx-auto" : "")
            }
          >
            CC
          </div>
          <h1 className="heading-lg text-(--text)">{title}</h1>
          {subtitle ? (
            <p className="body-md mt-1 text-(--text-secondary)">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </Card>
    </div>
  );
}

type RhfTextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
} & Pick<
  TextFieldProps,
  "label" | "type" | "autoComplete" | "placeholder" | "helpText" | "disabled"
>;

/**
 * A Polaris TextField bound to react-hook-form through a Controller. The
 * resolver's message shows as the field's InlineError; a blank message (used
 * to flag a field without words, e.g. a failed sign-in) only marks it invalid.
 *
 * TextField takes no ref, so RHF gets a small focus handle on the wrapper
 * instead — `setFocus` (autofocus) and focus-on-first-error keep working.
 */
export function RhfTextField<T extends FieldValues>({
  control,
  name,
  ...fieldProps
}: RhfTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const message = fieldState.error?.message;
        return (
          <div
            ref={(el) =>
              field.ref(
                el
                  ? { focus: () => el.querySelector("input")?.focus() }
                  : null,
              )
            }
          >
            <TextField
              {...fieldProps}
              name={field.name}
              value={(field.value ?? "") as string}
              onChange={(v) => field.onChange(v)}
              error={
                message && message.trim()
                  ? message
                  : fieldState.error
                    ? true
                    : undefined
              }
            />
          </div>
        );
      }}
    />
  );
}
