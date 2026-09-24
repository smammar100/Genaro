"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { useReplayTour } from "@/components/onboarding/onboarding-tour";
import { toast } from "@/lib/toast";
import { accountHandle } from "@/lib/auth/username";

/**
 * The account controls, shared by the nav rail (Shopify-admin layout: search
 * at the top, bell + account at the foot) and the first-run header, so the
 * two can never drift apart.
 */

/** Registration / stock-ID search. Jumps straight to an exact match. */
export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    const v = await vehicleService.getByRegistration(trimmed);
    if (v) {
      router.push(vehicleDetailHref(v.id, pathname));
      setValue("");
    } else {
      router.push(`/vehicles?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form id="tour-search" role="search" onSubmit={onSubmit} className={className}>
      <label className="relative block">
        <span className="sr-only">Search reg or stock ID</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/60"
        />
        <input
          type="search"
          data-nav-search=""
          placeholder="Search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-[34px] w-full rounded-xl border border-white/10 bg-white/[0.08] pl-8 pr-2 text-[13px] text-white outline-none placeholder:text-white/60 hover:bg-white/[0.12] focus-visible:border-white/30 focus-visible:bg-white/[0.12]"
        />
      </label>
    </form>
  );
}

/** Bell + recent notifications. */
export function NotificationsMenu() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        className="relative grid size-8 place-items-center rounded-xl text-white/80 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#e51c00] ring-2 ring-sidebar"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-72">
        <DropdownMenuLabel>
          {unreadCount > 0 ? `Notifications · ${unreadCount} unread` : "Notifications"}
        </DropdownMenuLabel>
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
        ) : (
          notifications.slice(0, 5).map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => {
                if (!n.read) void markRead(n.id);
                if (n.link) router.push(n.link);
              }}
            >
              <span className="flex min-w-0 flex-col">
                <span className={n.read ? "" : "font-semibold"}>{n.title}</span>
                {n.body && (
                  <span className="truncate text-xs text-muted-foreground">{n.body}</span>
                )}
              </span>
            </DropdownMenuItem>
          ))
        )}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void markAllRead()}>
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Initials for the account chip, e.g. "Raza Jaffery" -> "RJ". */
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

/**
 * Account chip — the Shopify admin's store switcher: a small green initials
 * tile and the name, opening Settings / replay tour / sign out.
 */
export function UserMenu({ align = "start" }: { align?: "start" | "end" }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const replayTour = useReplayTour();
  const name = user?.name ?? "";

  function handleSignOut() {
    signOut();
    toast.success("Signed out");
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-[30px] w-full min-w-0 items-center gap-2 rounded-xl pl-1.5 pr-2 text-[13px] font-medium tracking-[-0.01em] text-white/80 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-ring">
        <span
          aria-hidden
          className="grid size-5 shrink-0 place-items-center rounded-md bg-[#36fba1] text-[9px] font-bold text-[#0b3b2a]"
        >
          {initials(name)}
        </span>
        <span className="truncate" suppressHydrationWarning>
          {name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side="top" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-semibold text-foreground">{name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user ? accountHandle(user) : ""}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={replayTour}>Replay the tour</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
