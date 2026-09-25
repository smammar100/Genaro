"use client";

/**
 * Global command palette — Ctrl/Cmd+K anywhere in the dashboard, or the top
 * bar's search field (via `openCommandPalette`).
 *
 * This shell only owns the shortcut and the open state. The dialog (cmdk and
 * its Radix dialog, see ./command-palette-dialog) is fetched on the first
 * open, so pages that never open it never download it.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const CommandPaletteDialog = dynamic(() => import("./command-palette-dialog"), {
  ssr: false,
});

/** Window event that opens the palette from anywhere, without importing its state. */
const OPEN_EVENT = "cc:open-command-palette";

/** Opens the palette (loading the dialog on first use). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

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
    function onOpen() {
      setRequested(true);
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  return requested ? (
    <CommandPaletteDialog open={open} setOpen={setOpen} />
  ) : null;
}
