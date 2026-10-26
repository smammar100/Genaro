import { describe, expect, it } from "vitest";
import type { Capability } from "@/lib/capabilities";
import { navRows, navGroupForHref, visibleNavGroups } from "./nav";
import { MVP_HIDDEN_HREFS, navTourId } from "./sidebar-config";

const everything = () => true;
const only =
  (...caps: Capability[]) =>
  (c: Capability) =>
    caps.includes(c);

describe("visibleNavGroups", () => {
  it("hides MVP-held routes even from a super-user", () => {
    const hrefs = visibleNavGroups(everything, true).flatMap((g) => g.items.map((i) => i.href));
    for (const hidden of MVP_HIDDEN_HREFS) expect(hrefs).not.toContain(hidden);
  });

  it("drops a group the user can see nothing in", () => {
    const labels = visibleNavGroups(only("sales:create_lead"), false).map((g) => g.label);
    expect(labels).toEqual([null, "Sales"]);
  });
});

describe("navRows", () => {
  const groups = visibleNavGroups(everything, true);
  const find = (rows: ReturnType<typeof navRows>, label: string) =>
    rows.find((r) => r.label === label)!;

  it("opens the current route's group and selects exactly that page", () => {
    const rows = navRows(groups, { pathname: "/maintenance/calendar", tourGroup: null });
    const maintenance = find(rows, "Maintenance");
    expect(maintenance.selected).toBe(true);
    expect(maintenance.pages?.filter((p) => p.selected).map((p) => p.href)).toEqual([
      "/maintenance/calendar",
    ]);
    expect(find(rows, "Sales").selected).toBe(false);
    expect(find(rows, "Dashboard").selected).toBe(false);
  });

  it("opens the tour's group instead while the tour runs", () => {
    const rows = navRows(groups, { pathname: "/vehicles", tourGroup: "Sales" });
    expect(find(rows, "Sales").selected).toBe(true);
    expect(find(rows, "Inventory").selected).toBe(false);
  });

  it("opens the section the user clicked, without changing the current page", () => {
    const rows = navRows(groups, { pathname: "/dashboard", tourGroup: null, openGroup: "Sales" });
    expect(find(rows, "Sales").selected).toBe(true);
    expect(find(rows, "Sales").pages?.some((p) => p.selected)).toBe(false);
  });

  it("starts a new section at the lifecycle and at Administrative", () => {
    const rows = navRows(groups, { pathname: "/dashboard", tourGroup: null });
    expect(rows.filter((r) => r.newSection).map((r) => r.label)).toEqual([
      "Inventory",
      "Administrative",
    ]);
  });

  it("moves the section gap to the first group a user can see", () => {
    const salesOnly = visibleNavGroups(only("sales:create_lead"), false);
    const rows = navRows(salesOnly, { pathname: "/dashboard", tourGroup: null });
    expect(rows.filter((r) => r.newSection).map((r) => r.label)).toEqual(["Sales"]);
  });

  it("closes the route's section when the user closes it", () => {
    const rows = navRows(groups, { pathname: "/maintenance/calendar", tourGroup: null, openGroup: null });
    expect(rows.filter((r) => r.pages && r.selected)).toEqual([]);
  });

  it("anchors every page for the tour", () => {
    const rows = navRows(groups, { pathname: "/dashboard", tourGroup: null });
    expect(find(rows, "Dashboard").id).toBe(navTourId("/dashboard"));
    const ids = find(rows, "Warranties").pages?.map((p) => p.id);
    expect(ids).toContain("tour-nav-warranties-claims");
  });

  it("makes a single-page section the page's own link and anchor", () => {
    const rows = navRows(visibleNavGroups(only("sales:create_lead"), false), {
      pathname: "/sales/leads",
      tourGroup: null,
    });
    const sales = find(rows, "Sales");
    expect(sales).toMatchObject({ href: "/sales/leads", id: navTourId("/sales/leads"), selected: true });
    expect(sales.pages).toBeUndefined();
  });

  it("puts counts on the pages that have them", () => {
    const rows = navRows(groups, {
      pathname: "/warranties/claims",
      tourGroup: null,
      badges: { "/warranties/claims": "3" },
    });
    const claims = find(rows, "Warranties").pages?.find((p) => p.href === "/warranties/claims");
    expect(claims?.badge).toBe("3");
  });
});

describe("navGroupForHref", () => {
  it("finds the group a route lives in", () => {
    expect(navGroupForHref("/admin/locations")).toBe("Inventory");
    expect(navGroupForHref("/dashboard")).toBeNull();
    expect(navGroupForHref(undefined)).toBeNull();
  });
});
