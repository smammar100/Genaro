/**
 * The release check that compares the values the app saves with the lists
 * the database allows (scripts/check-db-values.mjs; bug list 2026-11-06).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLUMN_TYPES,
  compareWithDatabase,
  loggedActionTypes,
  parseAllowedValues,
  unionValues,
} from "../../scripts/db-values.mjs";

/** leads.source as it was on the live database until migration 0062. */
const SOURCE_CHECK_BEFORE_0062 =
  "CHECK ((source = ANY (ARRAY['website'::text, 'phone'::text, 'walk_in'::text, 'autotrader'::text, 'ebay'::text, 'facebook'::text, 'referral'::text, 'other'::text])))";
const SOURCE_CHECK_AFTER_0062 =
  "CHECK ((source = ANY (ARRAY['website'::text, 'phone'::text, 'walk_in'::text, 'autotrader'::text, 'cargurus'::text, 'ebay'::text, 'facebook'::text, 'referral'::text, 'other'::text])))";

const TYPES = `
export type LeadSource =
  | "website"
  | "phone"
  | "walk_in"
  | "autotrader"
  | "cargurus"
  | "ebay"
  | "facebook"
  | "referral"
  | "other";
export type AppointmentType = "viewing" | "collection" | "delivery";
export type LeadType = AppointmentType;
export type ActivityActionType = "lead_created" | "lead_converted";
`;

describe("parseAllowedValues", () => {
  it("reads the column and values of a plain list", () => {
    expect(parseAllowedValues(SOURCE_CHECK_AFTER_0062)).toEqual({
      column: "source",
      values: ["website", "phone", "walk_in", "autotrader", "cargurus", "ebay", "facebook", "referral", "other"],
    });
  });

  it("reads a list that also allows null", () => {
    expect(
      parseAllowedValues(
        "CHECK (((item_type IS NULL) OR (item_type = ANY (ARRAY['vehicle_price'::text, 'discount'::text]))))",
      ),
    ).toEqual({ column: "item_type", values: ["vehicle_price", "discount"] });
  });

  it("reads a varchar column's list", () => {
    expect(
      parseAllowedValues(
        "CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'won'::character varying])::text[])))",
      ),
    ).toEqual({ column: "status", values: ["open", "won"] });
  });

  it("keeps a quote inside a value", () => {
    expect(parseAllowedValues("CHECK ((label = ANY (ARRAY['o''clock'::text, 'noon'::text])))")?.values).toEqual([
      "o'clock",
      "noon",
    ]);
  });

  it("ignores checks that aren't a list of values", () => {
    expect(parseAllowedValues("CHECK ((selling_price >= (0)::numeric))")).toBeNull();
    expect(parseAllowedValues("CHECK ((char_length(name) > 0))")).toBeNull();
  });
});

describe("unionValues", () => {
  it("reads a type's values across lines", () => {
    expect(unionValues(TYPES, "LeadSource")).toContain("cargurus");
    expect(unionValues(TYPES, "LeadSource")).toHaveLength(9);
  });

  it("follows a type that names another", () => {
    expect(unionValues(TYPES, "LeadType")).toEqual(["viewing", "collection", "delivery"]);
  });

  it("is null for a type that isn't there", () => {
    expect(unionValues(TYPES, "NoSuchType")).toBeNull();
  });
});

describe("loggedActionTypes", () => {
  it("finds every action type the code logs", () => {
    const code = [
      `await activityService.log({ actionType: "lead_created", description: "x" });`,
      `activityService.log({ companyId, actionType: 'sale_completed' })`,
    ];
    expect(loggedActionTypes(code).sort()).toEqual(["lead_created", "sale_completed"]);
  });
});

describe("compareWithDatabase", () => {
  const leadsSource = (definition: string) => ({
    table_name: "leads",
    constraint_name: "leads_source_check",
    definition,
  });

  it("catches the 6 Nov bug: the app saves 'cargurus' and the database refuses it", () => {
    const res = compareWithDatabase([leadsSource(SOURCE_CHECK_BEFORE_0062)], TYPES);
    expect(res.refused).toEqual([
      expect.objectContaining({ column: "leads.source", constraint: "leads_source_check", refused: ["cargurus"] }),
    ]);
  });

  it("passes once the database allows it (migration 0062)", () => {
    const res = compareWithDatabase([leadsSource(SOURCE_CHECK_AFTER_0062)], TYPES);
    expect(res.refused).toEqual([]);
    expect(res.checked).toBe(1);
  });

  it("catches an action logged in code that the database doesn't allow", () => {
    const check = {
      table_name: "activity_log",
      constraint_name: "activity_log_action_type_check",
      definition: "CHECK ((action_type = ANY (ARRAY['lead_created'::text, 'lead_converted'::text])))",
    };
    expect(compareWithDatabase([check], TYPES).refused).toEqual([]);
    expect(compareWithDatabase([check], TYPES, ["deal_merged"]).refused[0]?.refused).toEqual(["deal_merged"]);
  });

  it("lists a checked column with no app type as not checked, rather than passing it", () => {
    const check = { table_name: "vehicles", constraint_name: "vehicles_colour_check", definition: "CHECK ((colour = ANY (ARRAY['red'::text])))" };
    const res = compareWithDatabase([check], TYPES);
    expect(res.unchecked).toEqual(["vehicles.colour"]);
    expect(res.refused).toEqual([]);
  });

  it("reports a mapped type it can't read", () => {
    const check = { table_name: "users", constraint_name: "users_role_check", definition: "CHECK ((role = ANY (ARRAY['owner'::text])))" };
    expect(compareWithDatabase([check], TYPES).missingTypes).toEqual(["users.role (UserRole)"]);
  });
});

describe("the real types file", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/types.ts"), "utf8");

  it.each(Object.entries(COLUMN_TYPES))("%s reads its values from %s", (_column, typeName) => {
    // A renamed or removed type would quietly stop its column being checked.
    expect(unionValues(source, typeName)?.length ?? 0).toBeGreaterThan(0);
  });
});
