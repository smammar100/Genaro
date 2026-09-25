"use client";

import * as React from "react";
import { Frame } from "@/components/polaris";
import { AdminTopBar } from "./admin-top-bar";

/**
 * The Polaris app shell: Frame + the app's TopBar + a navigation. Frame docks
 * the nav from 1040px and makes it a drawer (TopBar hamburger) below that; the
 * page renders in Frame's <main>, which is the one scrolling area.
 *
 * A route built on the Polaris <Page> brings its own gutters. The few that
 * don't (the Master sheet grid) get the same 24px here, so nothing is ever
 * double-padded or flush to the edges.
 */
export function AdminShell({
  navigation,
  children,
}: {
  /** An AdminNavigation; omitted, the Frame has no nav or hamburger. */
  navigation?: React.ReactElement;
  children?: React.ReactNode;
}) {
  return (
    <Frame height="100dvh" topBar={<AdminTopBar />} navigation={navigation}>
      <div className="p-6 has-[.p-page]:p-0">{children}</div>
    </Frame>
  );
}
