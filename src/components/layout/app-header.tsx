"use client";

import { createElement } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeft } from "lucide-react";
import { iconFromPath, titleFromPath } from "./sidebar-config";
import { UserMenu } from "./account-menus";
import { useIsWelcomeScreen } from "@/hooks/use-has-vehicles";
import { cn } from "@/lib/utils";

/**
 * The slim title bar at the top of the page panel, as in the Shopify admin:
 * the page's nav icon and name at 13px/600. On a phone it also carries the
 * button that opens the rail as a drawer; on desktop, while the rail is
 * hidden, the button that brings it back. Search, notifications, the account
 * and the connection dot live in the rail.
 */
export function AppHeader({
  onOpenNav,
  railHidden = false,
  onShowRail,
}: {
  onOpenNav?: () => void;
  /** Desktop rail hidden — show the toggle that brings it back. */
  railHidden?: boolean;
  onShowRail?: () => void;
}) {
  const pathname = usePathname();
  const isWelcome = useIsWelcomeScreen(pathname);
  const PageIcon = iconFromPath(pathname);

  // First-run screen: no rail to hold the account menu, so the row carries it.
  if (isWelcome) {
    return (
      <header className="flex h-14 shrink-0 items-center justify-end px-5">
        <UserMenu />
      </header>
    );
  }

  return (
    <header
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 border-b border-[#ebebeb] px-4",
      )}
    >
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1.5 grid size-8 place-items-center rounded-lg text-foreground hover:bg-accent lg:hidden"
      >
        <Menu className="size-5" />
      </button>
      {railHidden && (
        <button
          type="button"
          onClick={onShowRail}
          aria-label="Show navigation"
          title="Show navigation"
          className="-ml-1.5 hidden size-8 place-items-center rounded-lg text-foreground hover:bg-accent lg:grid"
        >
          <PanelLeft className="size-4" />
        </button>
      )}
      {PageIcon
        ? createElement(PageIcon, {
            "aria-hidden": true,
            className: "size-4 shrink-0 text-[#4a4a4a]",
          })
        : null}
      <h1
        data-header-title=""
        className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground"
      >
        {titleFromPath(pathname)}
      </h1>
    </header>
  );
}
