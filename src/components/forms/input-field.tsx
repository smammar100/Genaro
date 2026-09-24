"use client";

import { useId } from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InputFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  hint?: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "tel" | "url" | "search" | "number";
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  hideLabel?: boolean;
  autoComplete?: React.InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  size?: "s" | "m" | "l";
}

const SIZE_MAP = { s: "sm", m: "default", l: "lg" } as const;

/**
 * RHF-bound text field built on the app's <Input>. Renders a visible label
 * (screen-reader only when `hideLabel`), an optional hint and the field's
 * validation error, and wires the value through a Controller. Uses `onChange`
 * (per-keystroke) to keep the RHF value in sync.
 */
export function InputField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  placeholder,
  type = "text",
  required,
  disabled,
  readonly,
  hideLabel,
  autoComplete,
  size,
}: InputFieldProps<T>): React.ReactElement {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const describedBy =
          [hint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined;
        return (
          <div className="flex flex-col gap-1.5">
            {label && (
              <Label htmlFor={id} className={cn(hideLabel && "sr-only")}>
                {label}
              </Label>
            )}
            <Input
              id={id}
              placeholder={placeholder}
              type={type}
              name={field.name}
              ref={field.ref}
              value={(field.value ?? "") as string}
              required={required || undefined}
              disabled={disabled || undefined}
              readOnly={readonly || undefined}
              autoComplete={autoComplete}
              size={size ? SIZE_MAP[size] : undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
            />
            {hint && (
              <p id={hintId} className="text-xs text-muted-foreground">
                {hint}
              </p>
            )}
            {error && (
              <p
                id={errorId}
                className="text-xs font-medium text-destructive-foreground"
              >
                {error}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
