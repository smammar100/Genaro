import { toNestErrors, validateFieldsNatively } from "@hookform/resolvers";
import {
  appendErrors,
  type FieldError,
  type FieldValues,
  type Resolver,
} from "react-hook-form";

/**
 * Validation for the signed-out pages (login, forgot / reset / set password,
 * join) without zod.
 *
 * Those forms check two to four strings, but zod + `@hookform/resolvers/zod`
 * put ~200 KB of JS in front of every visitor's first page: the resolver does
 * `import * as core from "zod/v4/core"` and Turbopack keeps the whole of it
 * (zod/mini included). These are the same rules with the same messages and
 * issue codes, mapped to field errors the way the zod resolver does it —
 * form-resolver.test.ts pins that against the zod original.
 */

export interface FormIssue<T> {
  path: keyof T & string;
  /** zod's issue code (`too_small`, `invalid_format`, …) — becomes the error `type`. */
  code: string;
  message: string;
}

/** Rules return the (possibly normalised) values plus any issues, in field order. */
export type FormRules<T> = (values: T) => { values: T; issues: FormIssue<T>[] };

export function rulesResolver<T extends FieldValues>(
  rules: FormRules<T>,
): Resolver<T> {
  return async (input, _context, options) => {
    const { values, issues } = rules(input);
    if (issues.length === 0) {
      if (options.shouldUseNativeValidation) validateFieldsNatively({}, options);
      return { values, errors: {} };
    }

    // First issue per field wins; with criteriaMode "all" every message is
    // collected under `types` — both exactly as @hookform/resolvers/zod does.
    const allCriteria =
      !options.shouldUseNativeValidation && options.criteriaMode === "all";
    const errors: Record<string, FieldError> = {};
    for (const { path, code, message } of issues) {
      if (!errors[path]) errors[path] = { message, type: code };
      if (allCriteria) {
        const messages = errors[path].types?.[code];
        errors[path] = appendErrors(
          path,
          allCriteria,
          errors,
          code,
          messages
            ? ([] as string[]).concat(messages as string | string[], message)
            : message,
        ) as FieldError;
      }
    }
    return { values: {}, errors: toNestErrors(errors, options) };
  };
}

/** zod v4's `z.email()` pattern, so the same addresses pass and fail. */
const EMAIL =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export function emailIssue<T>(
  path: keyof T & string,
  value: string,
): FormIssue<T>[] {
  return EMAIL.test(value)
    ? []
    : [{ path, code: "invalid_format", message: "Enter a valid email address" }];
}

export function requiredIssue<T>(
  path: keyof T & string,
  value: string,
  message: string,
): FormIssue<T>[] {
  return value.length >= 1 ? [] : [{ path, code: "too_small", message }];
}

interface NewPassword {
  password: string;
  confirm: string;
}

/**
 * A new password (8-72 characters — bcrypt's input limit) typed twice.
 *
 * The match check runs even when the length check fails, as the zod `.refine`
 * it replaces did, so both messages can show at once.
 */
export function newPasswordIssues<T extends NewPassword>(
  values: T,
): FormIssue<T>[] {
  const issues: FormIssue<T>[] = [];
  const pw = values.password;
  if (pw.length < 8) {
    issues.push({
      path: "password",
      code: "too_small",
      message: "Password must be at least 8 characters",
    });
  } else if (pw.length > 72) {
    issues.push({
      path: "password",
      code: "too_big",
      message: "Password must be 72 characters or fewer",
    });
  }
  if (values.password !== values.confirm) {
    issues.push({ path: "confirm", code: "custom", message: "Passwords do not match" });
  }
  return issues;
}
