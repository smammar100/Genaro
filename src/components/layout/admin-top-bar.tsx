"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ActionList,
  Avatar,
  Badge,
  Popover,
  TopBar,
  type ActionListSection,
} from "@/components/polaris";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";
import { useReplayTour } from "@/components/onboarding/onboarding-tour";
import { accountHandle } from "@/lib/auth/username";
import { toast } from "@/lib/toast";
import { openCommandPalette } from "./command-palette";
import { HealthIndicator } from "./health-indicator";

type Menu = "account" | "notifications";

/**
 * The Polaris TopBar with the app's controls: the company as the logo (and the
 * tour's #tour-brand), the connection dot, a search field that opens the ⌘K
 * command palette (#tour-search), and the notifications and account menus.
 *
 * Both menus are one Popover whose activator is the whole bar: the panel hangs
 * from the bar's right edge, and clicks on the bar's own buttons count as
 * inside it, so a button can toggle its menu or swap to the other one.
 */
export function AdminTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, company, signOut } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const replayTour = useReplayTour();
  const [menu, setMenu] = React.useState<Menu | null>(null);
  const close = React.useCallback(() => setMenu(null), []);
  const toggle = (which: Menu) => setMenu((m) => (m === which ? null : which));

  // Navigating closes the menus (adjust-state-on-prop-change, in render).
  const [menuPath, setMenuPath] = React.useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMenu(null);
  }

  const companyName = company?.name ?? "Car Capital UK";
  const handle = user ? accountHandle(user) : "";

  function handleSignOut() {
    signOut();
    toast.success("Signed out");
    router.push("/login");
  }

  const accountSections: ActionListSection[] = [
    {
      title: handle || undefined,
      items: [
        { content: "Settings", icon: "SettingsMinor", url: "/admin/settings" },
        { content: "Replay the tour", icon: "PlayMinor", onAction: replayTour },
      ],
    },
    { items: [{ content: "Sign out", icon: "ExitMajor", onAction: handleSignOut }] },
  ];

  const notificationSections: ActionListSection[] = [
    {
      title: unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications",
      items:
        notifications.length === 0
          ? [{ content: "No notifications", disabled: true }]
          : notifications.slice(0, 5).map((n) => ({
              content: n.title,
              helpText: n.body || undefined,
              suffix: n.read ? undefined : <Badge tone="info">New</Badge>,
              onAction: () => {
                if (!n.read) void markRead(n.id);
                if (n.link) router.push(n.link);
              },
            })),
    },
    ...(notifications.length > 0
      ? [
          {
            items: [
              { content: "Mark all as read", icon: "TickMinor" as const, onAction: () => void markAllRead() },
            ],
          },
        ]
      : []),
  ];

  const logo = (
    <span className="flex min-w-0 items-center gap-2">
      <Link
        id="tour-brand"
        href="/dashboard"
        className="flex min-w-0 items-center gap-2 text-inherit no-underline"
      >
        {/* Decorative: the name beside it labels the link. */}
        <span aria-hidden className="flex">
          <Avatar size="sm" name={companyName} source={company?.logoMarkUrl ?? undefined} />
        </span>
        <span className="truncate" suppressHydrationWarning>
          {companyName}
        </span>
      </Link>
      <HealthIndicator />
    </span>
  );

  return (
    // The panel lines up with the activator's right edge; the 8px margin
    // (cancelled on the bar itself) keeps it off the edge of the window.
    <Popover
      className="block mr-2"
      active={menu !== null}
      onClose={close}
      preferredAlignment="right"
      activator={
        <div className="-mr-2">
          <TopBar
            logo={logo}
            storeName={user?.name || handle || "Account"}
            searchPlaceholder="Search vehicles and pages"
            searchId="tour-search"
            onSearchFocus={() => {
              // Blur first: the palette's dialog returns focus to whatever
              // was focused when it opened, and refocusing the field would
              // open it again.
              (document.activeElement as HTMLElement | null)?.blur();
              setMenu(null);
              openCommandPalette();
            }}
            showSidekick={false}
            unreadNotifications={unreadCount > 0}
            onNotificationsClick={() => toggle("notifications")}
            onUserMenuClick={() => toggle("account")}
          />
        </div>
      }
    >
      {menu === "account" ? (
        <ActionList sections={accountSections} onActionAnyItem={close} />
      ) : menu === "notifications" ? (
        <ActionList sections={notificationSections} onActionAnyItem={close} />
      ) : null}
    </Popover>
  );
}
