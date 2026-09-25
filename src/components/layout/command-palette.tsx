"use client";

/**
 * Global command palette — Ctrl/Cmd+K anywhere in the dashboard.
 *
 * This shell only owns the shortcut and the open state. The dialog (cmdk and
 * its Radix dialog, see ./command-palette-dialog) is fetched on the first
 * Ctrl/Cmd+K, so pages that never open it never download it.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const CommandPaletteDialog = dynamic(() => import("./command-palette-dialog"), {
  ssr: false,
});

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  // Mounted from the first open on, so closing keeps cmdk's exit behaviour and
  // reopening is instant.
  const [requested, setRequested] = useState(false);

  // Ctrl/Cmd+K toggles; Escape is handled by cmdk's dialog.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setRequested(true);
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return requested ? (
    <CommandPaletteDialog open={open} setOpen={setOpen} />
  ) : null;
}
