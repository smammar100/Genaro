import { describe, expect, test } from "vitest";
import {
  accountHandle,
  isSyntheticEmail,
  syntheticEmail,
  normalizeUsername,
  isValidUsername,
  looksLikeEmail,
  suggestUsername,
  INTERNAL_EMAIL_DOMAIN,
  DEFAULT_ORG_SLUG,
} from "./username";

describe("username helpers", () => {
  // The login page and the create route MUST derive the same synthetic email for
  // a (slug, username) pair — otherwise a username user could be created but never
  // log in. This locks that contract.
  test("syntheticEmail is deterministic and matches the documented format", () => {
    expect(syntheticEmail("car-capital-uk", "ahmed.khan")).toBe(
      "ahmed.khan@car-capital-uk.staff.carcapital.uk",
    );
  });

  test("syntheticEmail lower-cases the username part", () => {
    expect(syntheticEmail("car-capital-uk", "Ahmed.Khan")).toBe(
      "ahmed.khan@car-capital-uk.staff.carcapital.uk",
    );
  });

  test("defaults align with migration 0026 (slug) + the internal domain", () => {
    expect(DEFAULT_ORG_SLUG).toBe("car-capital-uk");
    expect(INTERNAL_EMAIL_DOMAIN).toBe("staff.carcapital.uk");
  });

  test("isValidUsername mirrors the DB CHECK constraint", () => {
    expect(isValidUsername("ahmed.khan")).toBe(true);
    expect(isValidUsername("a.b")).toBe(true); // 3 chars, ok
    expect(isValidUsername("user_01")).toBe(true);
    expect(isValidUsername("ab")).toBe(false); // too short (<3)
    expect(isValidUsername("_ab")).toBe(false); // must start alphanumeric
    expect(isValidUsername("ab-")).toBe(false); // must end alphanumeric
    expect(isValidUsername("ahmed khan")).toBe(false); // no spaces
    expect(isValidUsername("a".repeat(33))).toBe(false); // too long (>32)
  });

  test("looksLikeEmail distinguishes an email from a username", () => {
    expect(looksLikeEmail("admin@carcapital.uk")).toBe(true);
    expect(looksLikeEmail("ahmed.khan")).toBe(false);
  });

  test("suggestUsername derives a handle from a person's name", () => {
    expect(suggestUsername("Ahmed Khan")).toBe("ahmed.khan");
    expect(suggestUsername("  Mary-Jane  O'Neil ")).toBe("mary.jane.o.neil");
  });

  test("normalizeUsername trims and lower-cases", () => {
    expect(normalizeUsername("  Ahmed.Khan ")).toBe("ahmed.khan");
  });

  // Client, 18 Sep 2026: the generated address under a user card "looks weird".
  test("isSyntheticEmail spots only minted addresses", () => {
    expect(isSyntheticEmail(syntheticEmail("car-capital-uk", "ali"))).toBe(true);
    expect(isSyntheticEmail("abbas@carcapital.uk")).toBe(false);
    expect(isSyntheticEmail(null)).toBe(false);
  });

  test("accountHandle shows a real email, else the username", () => {
    expect(accountHandle({ email: "abbas@carcapital.uk", username: null })).toBe(
      "abbas@carcapital.uk",
    );
    expect(
      accountHandle({
        email: syntheticEmail("car-capital-uk", "ahmed.khan"),
        username: "ahmed.khan",
      }),
    ).toBe("ahmed.khan");
    // Username column missing: fall back to the synthetic local part.
    expect(
      accountHandle({ email: syntheticEmail("car-capital-uk", "ali"), username: null }),
    ).toBe("ali");
    expect(accountHandle({ email: null, username: "raza" })).toBe("raza");
  });
});
