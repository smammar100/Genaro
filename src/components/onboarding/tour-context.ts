"use client";

/**
 * Onborda's tour state (which tour, which step, visible or not) without the
 * tour itself.
 *
 * The package root re-exports its `Onborda` component too, and that drags
 * framer-motion and a Radix portal into every dashboard page even though the
 * tour only ever runs once per user. This file is ~50 lines of context, so the
 * provider and the hook can sit in the shell (the sidebar reads the step it is
 * on) while the component loads lazily in ./tour-runtime.
 *
 * It must stay the SAME module Onborda itself imports (`./OnbordaContext`
 * inside the package) or the two sides would hold separate contexts.
 */
export { OnbordaProvider, useOnborda } from "onborda/dist/OnbordaContext";
