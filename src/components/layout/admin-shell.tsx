"use client";

import * as React from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button, Frame } from "@/components/genaro";
import { SidebarProvider, useSidebar } from "@/components/fluid/sidebar";
import { AdminTopBar } from "./admin-top-bar";
import { useSidebarDefaultOpen } from "./sidebar-preference";

/**
 * The app shell: the Genaro top bar across the top, Fluid Functionalism's
 * Sidebar down the left, and the page in the scrolling <main>. The shell keeps
 * the Genaro Frame's classes (p-frame, p-frame__main) so the container
 * queries, the reserved scrollbar gutter and the Kanban board's fill-height
 * measurement behave as before. The sidebar docks from 1024px and is a drawer
 * below that, opened from the top bar's menu button; its open state persists.
 *
 * A route built on the Genaro <Page> brings its own gutters. The few that
 * don't (the Master sheet grid) get the same 24px here, so nothing is ever
 * double-padded or flush to the edges.
 */
export function AdminShell({
  navigation,
  children,
}: {
  /** An AdminNavigation; omitted, the shell has no sidebar or menu button. */
  navigation?: React.ReactElement;
  children?: React.ReactNode;
}) {
  const defaultOpen = useSidebarDefaultOpen();
  const page = <div className="p-6 has-[.p-page]:p-0">{children}</div>;

  if (!navigation) {
    return (
      <Frame height="100dvh" topBar={<AdminTopBar />}>
        {page}
      </Frame>
    );
  }

  return (
    // 14rem: narrower than the library's 16rem default (and Genaro's 240px).
    <SidebarProvider
      defaultOpen={defaultOpen}
      width="14rem"
      mobileBreakpoint={1024}
      className="p-frame min-h-0 flex-col"
      style={{ height: "100dvh" }}
    >
      <ShellTopBar />
      <div className="p-frame__body">
        {navigation}
        <main className="p-frame__main">{page}</main>
        <ShowSidebarButton />
      </div>
    </SidebarProvider>
  );
}

/**
 * While the sidebar is collapsed on a wide window, the way back: a button in
 * the same corner as the sidebar's own collapse button.
 */
function ShowSidebarButton() {
  const { open, isMobile, toggleSidebar } = useSidebar();
  if (open || isMobile) return null;
  return (
    <div className="absolute bottom-3 left-3 z-10">
      <Button icon={<PanelLeftOpen className="size-4" />} accessibilityLabel="Show sidebar" title="Show sidebar ([)" onClick={toggleSidebar} />
    </div>
  );
}

/** The top bar, its menu button toggling the sidebar (the drawer when narrow). */
function ShellTopBar() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <div className="p-frame__topbar">
      <AdminTopBar onNavigationToggle={toggleSidebar} navigationOpen={open} />
    </div>
  );
}
