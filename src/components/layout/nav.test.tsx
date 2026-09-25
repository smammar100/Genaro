import { describe, expect, it } from "vitest";
import type { Capability } from "@/lib/capabilities";
import { navItems, navGroupForHref, settingsNavItem, visibleNavGroups } from "./nav";
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

describe("navItems", () => {
  const groups = visibleNavGroups(everything, true);
  const find = (items: ReturnType<typeof navItems>, label: string) =>
    items.find((i) => i.label === label)!;

  it("opens the current route's group and selects exactly that page", () => {
    const items = navItems(groups, { pathname: "/maintenance/calendar", tourGroup: null });
    const maintenance = find(items, "Maintenance");
    expect(maintenance.selected).toBe(true);
    expect(maintenance.subNavigationItems?.filter((s) => s.selected).map((s) => s.url)).toEqual([
      "/maintenance/calendar",
    ]);
    expect(find(items, "Sales").selected).toBe(false);
    expect(find(items, "Dashboard").selected).toBe(false);
  });

  it("opens the tour's group instead while the tour runs", () => {
    const items = navItems(groups, { pathname: "/vehicles", tourGroup: "Sales" });
    expect(find(items, "Sales").selected).toBe(true);
    expect(find(items, "Inventory").selected).toBe(false);
  });

  it("anchors every page for the tour", () => {
    const items = navItems(groups, { pathname: "/dashboard", tourGroup: null });
    expect(find(items, "Dashboard").id).toBe(navTourId("/dashboard"));
    const ids = find(items, "Warranties").subNavigationItems?.map((s) => s.id);
    expect(ids).toContain("tour-nav-warranties-claims");
  });

  it("makes a single-page section the page's own link and anchor", () => {
    const items = navItems(visibleNavGroups(only("sales:create_lead"), false), {
      pathname: "/sales/leads",
      tourGroup: null,
    });
    const sales = find(items, "Sales");
    expect(sales).toMatchObject({ url: "/sales/leads", id: navTourId("/sales/leads"), selected: true });
    expect(sales.subNavigationItems).toBeUndefined();
  });

  it("puts counts on the pages that have them", () => {
    const items = navItems(groups, {
      pathname: "/warranties/claims",
      tourGroup: null,
      badges: { "/warranties/claims": "3" },
    });
    const claims = find(items, "Warranties").subNavigationItems?.find((s) => s.url === "/warranties/claims");
    expect(claims?.badge).toBe("3");
  });
});

describe("navGroupForHref / settingsNavItem", () => {
  it("finds the group a route lives in", () => {
    expect(navGroupForHref("/admin/locations")).toBe("Inventory");
    expect(navGroupForHref("/dashboard")).toBeNull();
    expect(navGroupForHref(undefined)).toBeNull();
  });

  it("selects Settings on its sub-routes", () => {
    expect(settingsNavItem("/admin/settings").selected).toBe(true);
    expect(settingsNavItem("/admin/settings/profile").selected).toBe(true);
    expect(settingsNavItem("/admin/users-and-permissions").selected).toBe(false);
  });
});
