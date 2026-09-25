import { describe, expect, it } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  emailIssue,
  newPasswordIssues,
  requiredIssue,
  rulesResolver,
  type FormRules,
} from "./form-resolver";

// The zod schemas the signed-out pages used before, verbatim: the rules must
// produce the same errors, messages, types and output values.
const joinSchema = z
  .object({
    name: z.string().trim().optional(),
    email: z.string().email("Enter a valid email address"),
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
type Join = z.infer<typeof joinSchema>;
const joinRules: FormRules<Join> = (values) => ({
  values: { ...values, name: values.name?.trim() },
  issues: [...emailIssue<Join>("email", values.email), ...newPasswordIssues(values)],
});

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your username or email"),
  password: z.string().min(1, "Password is required"),
});
type Login = z.infer<typeof loginSchema>;
const loginRules: FormRules<Login> = (values) => ({
  values,
  issues: [
    ...requiredIssue<Login>("identifier", values.identifier, "Enter your username or email"),
    ...requiredIssue<Login>("password", values.password, "Password is required"),
  ],
});

const EMAILS = [
  "ada@example.com",
  "ADA.Lovelace+tag@sub.example.co.uk",
  "o'brien@example.ie",
  "",
  "nope",
  "a..b@example.com",
  ".a@example.com",
  "a.@example.com",
  "a@b.c",
  "a@-b.com",
  "a@b..com",
  " ada@example.com",
];
const PASSWORDS: [string, string][] = [
  ["12345678", "12345678"],
  ["short", "other"],
  ["short", "short"],
  ["x".repeat(72), "x".repeat(72)],
  ["x".repeat(73), "x".repeat(73)],
  ["x".repeat(80), "y"],
  ["", ""],
];

describe("rulesResolver matches @hookform/resolvers/zod", () => {
  for (const criteriaMode of ["firstError", "all"] as const) {
    const options = { fields: {}, shouldUseNativeValidation: false, criteriaMode };

    it(`join / reset / set password (criteriaMode: ${criteriaMode})`, async () => {
      for (const email of EMAILS) {
        for (const [password, confirm] of PASSWORDS) {
          for (const name of [undefined, "", "  Ada  "]) {
            const values = { name, email, password, confirm };
            expect(await rulesResolver(joinRules)(values, undefined, options)).toEqual(
              await zodResolver(joinSchema)(values, undefined, options),
            );
          }
        }
      }
    });

    it(`login (criteriaMode: ${criteriaMode})`, async () => {
      for (const identifier of ["", "ada", "ada@example.com"]) {
        for (const password of ["", "x"]) {
          const values = { identifier, password };
          expect(await rulesResolver(loginRules)(values, undefined, options)).toEqual(
            await zodResolver(loginSchema)(values, undefined, options),
          );
        }
      }
    });
  }
});
