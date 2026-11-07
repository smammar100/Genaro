import { describe, expect, it } from "vitest";
import {
  applyTableFilters,
  applyTableSort,
  countTableValues,
  defaultTableRule,
  isTableRuleActive,
  matchesTableRule,
  withTableOperator,
  type TableFilterField,
  type TableFilterRule,
} from "./tableRules";

interface Car {
  reg: string;
  make: string | null;
  mileage: number | null;
  sold: string | null;
  location: string | null;
  vat: boolean;
}

const CARS: Car[] = [
  { reg: "LT07 JDK", make: "Ford", mileage: 82000, sold: "2026-10-03", location: "Forecourt", vat: true },
  { reg: "PK63 XAW", make: "Vauxhall", mileage: 45000, sold: null, location: "Yard", vat: false },
  { reg: "WF58 KXY", make: "ford", mileage: null, sold: "2026-11-01T09:30:00Z", location: null, vat: false },
  { reg: "HN62 KPY", make: "BMW", mileage: 120500, sold: "2026-09-12", location: "Forecourt", vat: true },
];

const FIELDS: TableFilterField[] = [
  { id: "make", label: "Make", variant: "text" },
  { id: "mileage", label: "Mileage", variant: "number" },
  { id: "sold", label: "Date sold", variant: "date" },
  { id: "location", label: "Location", variant: "select" },
  { id: "vat", label: "VAT qualifying", variant: "boolean" },
];

const get = (car: Car, field: string) => car[field as keyof Car];
const rule = (field: string, operator: TableFilterRule["operator"], value: TableFilterRule["value"]): TableFilterRule => ({
  id: `${field}-${operator}`,
  field,
  operator,
  value,
});
const regs = (cars: Car[]) => cars.map((c) => c.reg);

describe("text rules", () => {
  it("contains ignores case", () => {
    expect(regs(applyTableFilters(CARS, [rule("make", "contains", "FOR")], "and", FIELDS, get))).toEqual(["LT07 JDK", "WF58 KXY"]);
  });
  it("is / is not compare the whole value", () => {
    expect(matchesTableRule("Ford", rule("make", "is", "ford"), "text")).toBe(true);
    expect(matchesTableRule("Ford Focus", rule("make", "is", "ford"), "text")).toBe(false);
    expect(matchesTableRule(null, rule("make", "isNot", "ford"), "text")).toBe(true);
  });
  it("does not contain keeps blank cells", () => {
    expect(matchesTableRule(null, rule("make", "notContains", "ford"), "text")).toBe(true);
  });
});

describe("number rules", () => {
  it("compares in words", () => {
    expect(regs(applyTableFilters(CARS, [rule("mileage", "gte", "82000")], "and", FIELDS, get))).toEqual(["LT07 JDK", "HN62 KPY"]);
    expect(regs(applyTableFilters(CARS, [rule("mileage", "lt", "82000")], "and", FIELDS, get))).toEqual(["PK63 XAW"]);
  });
  it("between takes either end alone", () => {
    expect(regs(applyTableFilters(CARS, [rule("mileage", "between", ["50000", "100000"])], "and", FIELDS, get))).toEqual(["LT07 JDK"]);
    expect(regs(applyTableFilters(CARS, [rule("mileage", "between", ["100000", ""])], "and", FIELDS, get))).toEqual(["HN62 KPY"]);
  });
  it("a blank mileage can't be compared but is not any number", () => {
    expect(matchesTableRule(null, rule("mileage", "gte", "1"), "number")).toBe(false);
    expect(matchesTableRule(null, rule("mileage", "isNot", "1"), "number")).toBe(true);
  });
});

describe("date rules", () => {
  it("compares days, timestamps included", () => {
    expect(regs(applyTableFilters(CARS, [rule("sold", "gte", "2026-10-01")], "and", FIELDS, get))).toEqual(["LT07 JDK", "WF58 KXY"]);
    expect(regs(applyTableFilters(CARS, [rule("sold", "is", "2026-11-01")], "and", FIELDS, get))).toEqual(["WF58 KXY"]);
  });
  it("between is inclusive", () => {
    expect(regs(applyTableFilters(CARS, [rule("sold", "between", ["2026-09-12", "2026-10-03"])], "and", FIELDS, get))).toEqual(["LT07 JDK", "HN62 KPY"]);
  });
});

describe("select, boolean and empty rules", () => {
  it("is any of / none of", () => {
    expect(regs(applyTableFilters(CARS, [rule("location", "anyOf", ["Yard"])], "and", FIELDS, get))).toEqual(["PK63 XAW"]);
    expect(regs(applyTableFilters(CARS, [rule("location", "noneOf", ["Forecourt"])], "and", FIELDS, get))).toEqual(["PK63 XAW", "WF58 KXY"]);
  });
  it("boolean", () => {
    expect(regs(applyTableFilters(CARS, [rule("vat", "is", "true")], "and", FIELDS, get))).toEqual(["LT07 JDK", "HN62 KPY"]);
  });
  it("is empty / is not empty", () => {
    expect(regs(applyTableFilters(CARS, [rule("location", "empty", "")], "and", FIELDS, get))).toEqual(["WF58 KXY"]);
    expect(regs(applyTableFilters(CARS, [rule("mileage", "notEmpty", "")], "and", FIELDS, get))).toHaveLength(3);
  });
});

describe("joining and incomplete rules", () => {
  const ford = rule("make", "contains", "ford");
  const yard = rule("location", "anyOf", ["Yard"]);
  it("and needs every rule, or any", () => {
    expect(applyTableFilters(CARS, [ford, yard], "and", FIELDS, get)).toEqual([]);
    expect(regs(applyTableFilters(CARS, [ford, yard], "or", FIELDS, get))).toEqual(["LT07 JDK", "PK63 XAW", "WF58 KXY"]);
  });
  it("a rule waiting for its value, or on an unknown field, is left out", () => {
    expect(applyTableFilters(CARS, [rule("make", "contains", "  ")], "and", FIELDS, get)).toBe(CARS);
    expect(applyTableFilters(CARS, [rule("nope", "is", "x")], "and", FIELDS, get)).toBe(CARS);
    expect(isTableRuleActive(rule("mileage", "is", "abc"), FIELDS[1])).toBe(false);
    expect(isTableRuleActive(rule("location", "anyOf", []), FIELDS[3])).toBe(false);
  });
});

describe("editing rules", () => {
  it("a new rule takes the variant's first condition", () => {
    expect(defaultTableRule(FIELDS[0], "a")).toEqual({ id: "a", field: "make", operator: "contains", value: "" });
    expect(defaultTableRule(FIELDS[3], "b")).toEqual({ id: "b", field: "location", operator: "anyOf", value: [] });
  });
  it("a typed value survives a change of condition, unless its shape changes", () => {
    const r = rule("mileage", "is", "5");
    expect(withTableOperator(r, "number", "gte").value).toBe("5");
    expect(withTableOperator(r, "number", "between").value).toEqual(["", ""]);
    expect(withTableOperator(r, "number", "empty").value).toBe("");
  });
});

describe("sorting", () => {
  it("sorts by several columns, blanks last both ways", () => {
    const byMileage = applyTableSort(CARS, [{ field: "mileage", desc: true }], get);
    expect(regs(byMileage)).toEqual(["HN62 KPY", "LT07 JDK", "PK63 XAW", "WF58 KXY"]);
    const byMake = applyTableSort(CARS, [{ field: "make", desc: false }, { field: "mileage", desc: false }], get);
    // "Ford" and "ford" tie; mileage breaks it, the blank mileage last.
    expect(regs(byMake)).toEqual(["HN62 KPY", "LT07 JDK", "WF58 KXY", "PK63 XAW"]);
  });
  it("leaves the rows alone without rules", () => {
    expect(applyTableSort(CARS, [], get)).toBe(CARS);
  });
});

describe("value counts", () => {
  it("counts each value, skipping blanks", () => {
    expect(Object.fromEntries(countTableValues(CARS, (c) => c.location))).toEqual({ Forecourt: 2, Yard: 1 });
  });
});
