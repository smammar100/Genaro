import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Testing Library only auto-registers its cleanup when the test framework
 * exposes globals, and this project runs vitest without `globals: true`.
 * Without this, every render stays mounted and queries start matching
 * elements left behind by earlier tests in the same file.
 */
afterEach(cleanup);
