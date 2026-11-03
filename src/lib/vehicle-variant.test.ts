import { describe, expect, it } from "vitest";
import {
  hasCodeButNoName,
  hasReadableVariant,
  variantLabel,
  variantSearchTerms,
} from "./vehicle-variant";

describe("variantLabel", () => {
  // A bare engine size ("2.0") says less than the full description.
  it("prefers the full AutoTrader derivative over a bare engine size", () => {
    expect(
      variantLabel({
        variantName: "2.0",
        derivative: "2.0 318d Sport Saloon 4dr Diesel Auto Euro 6 (s/s) (150 ps)",
        variantCode: "TG68",
      }),
    ).toBe("2.0 318d Sport Saloon 4dr Diesel Auto Euro 6 (s/s) (150 ps)");
  });

  // Bug 9 (2026-11-02): an edited variant never showed over the derivative.
  it("shows the dealer's own variant over the AutoTrader derivative", () => {
    expect(
      variantLabel({
        variantName: "2.0 A SP",
        derivative: "3.0 TDI V6 50 Black Edition Saloon 4dr Diesel Tiptronic quattro Euro 6 (s/s) (286 ps)",
      }),
    ).toBe("2.0 A SP");
  });

  it("falls back to the derivative when the variant is cleared", () => {
    expect(variantLabel({ variantName: "", derivative: "2.0 TFSI S line" })).toBe("2.0 TFSI S line");
  });

  it("shows a bare engine size when it is all there is", () => {
    expect(variantLabel({ variantName: "2.0", derivative: null })).toBe("2.0");
  });

  it("falls back to the variant name when there is no derivative", () => {
    expect(
      variantLabel({
        variantName: "SE Technology",
        derivative: null,
        variantCode: "TG68",
      }),
    ).toBe("SE Technology");
  });

  // GEN-91, the actual bug: a car with only a code showed "TG68" in inventory.
  it("never falls back to the raw variant code", () => {
    expect(
      variantLabel({ variantName: null, derivative: null, variantCode: "TG68" }),
    ).toBe("—");
  });

  it("treats a whitespace-only name as absent", () => {
    expect(
      variantLabel({ variantName: "   ", derivative: null, variantCode: "TG68" }),
    ).toBe("—");
  });

  it("trims a padded name", () => {
    expect(variantLabel({ variantName: "  SE Technology  " })).toBe(
      "SE Technology",
    );
  });

  it("returns an em dash when nothing is known", () => {
    expect(variantLabel({})).toBe("—");
  });

  it("honours a caller-supplied fallback", () => {
    expect(variantLabel({}, "Unknown variant")).toBe("Unknown variant");
  });

  it("handles undefined fields as well as null", () => {
    expect(variantLabel({ variantName: undefined, derivative: undefined })).toBe(
      "—",
    );
  });
});

describe("variantSearchTerms", () => {
  // GEN-91 UAT 5: the code stays findable even though it is not displayed.
  it("includes the code so a code search still matches", () => {
    expect(
      variantSearchTerms({
        variantName: "SE Technology",
        derivative: null,
        variantCode: "TG68",
      }),
    ).toEqual(["SE Technology", "TG68"]);
  });

  it("omits empty and whitespace-only values", () => {
    expect(
      variantSearchTerms({ variantName: "", derivative: "  ", variantCode: "TG68" }),
    ).toEqual(["TG68"]);
  });

  it("returns an empty list when nothing is known", () => {
    expect(variantSearchTerms({})).toEqual([]);
  });
});

describe("hasReadableVariant", () => {
  it("is true when a variant name exists", () => {
    expect(hasReadableVariant({ variantName: "SE Technology" })).toBe(true);
  });

  it("is true when only the AutoTrader derivative exists", () => {
    expect(hasReadableVariant({ derivative: "2.0 TDI SE 5dr" })).toBe(true);
  });

  /**
   * The advert-completeness check used to treat a bare code as a filled-in
   * derivative, marking an incomplete advert "done" on meaningless data.
   */
  it("is false when only an opaque code exists", () => {
    expect(
      hasReadableVariant({ variantName: null, derivative: null, variantCode: "TG68" }),
    ).toBe(false);
  });

  it("is false when nothing is known", () => {
    expect(hasReadableVariant({})).toBe(false);
  });

  it("treats whitespace as absent", () => {
    expect(hasReadableVariant({ variantName: "  ", derivative: "" })).toBe(false);
  });
});

describe("hasCodeButNoName", () => {
  it("flags the record shape that caused the bug", () => {
    expect(
      hasCodeButNoName({ variantName: null, derivative: null, variantCode: "TG68" }),
    ).toBe(true);
  });

  it("is false once a name exists", () => {
    expect(
      hasCodeButNoName({ variantName: "SE", derivative: null, variantCode: "TG68" }),
    ).toBe(false);
  });

  it("is false when there is no code either", () => {
    expect(hasCodeButNoName({})).toBe(false);
  });
});
