"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Whether the sidebar starts open, read on the server from the sidebar's own
 * `sidebar_state` cookie (written whenever it is collapsed or shown), so a
 * collapsed sidebar stays collapsed across reloads without a flash open.
 */
const SidebarDefaultOpen = createContext(true);

export function SidebarPreference({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: ReactNode;
}) {
  return <SidebarDefaultOpen.Provider value={defaultOpen}>{children}</SidebarDefaultOpen.Provider>;
}

export function useSidebarDefaultOpen(): boolean {
  return useContext(SidebarDefaultOpen);
}
