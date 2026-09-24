"use client";

import { useEffect } from "react";

/**
 * Start loading the Nord <nord-*> custom elements as early as possible.
 *
 * `customElements.define()` throws in Node, so the registry can never be
 * imported during SSR. It used to be imported from a useEffect, which meant
 * nothing started downloading until React had finished hydrating the whole
 * page — and until the chunk arrived every <nord-button>, <nord-input> and
 * <nord-select> was an undefined element: hidden by @nordhealth/css and dead
 * to clicks. On a slow connection or a cold server that window was long
 * enough to read as "the button doesn't work until I refresh" (client,
 * 18 Sep 2026).
 *
 * Now the import is kicked off the moment this client module is evaluated in
 * the browser — before hydration starts — so the chunk downloads in parallel
 * with React instead of after it. The effect stays as a no-op safety net (the
 * module cache makes a second import free).
 */
function loadRegistry(): void {
  void import("./register");
}

if (typeof window !== "undefined") loadRegistry();

export function NordRegister(): null {
  useEffect(loadRegistry, []);
  return null;
}
