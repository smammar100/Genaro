import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Storybook is the design system's source of truth: every component the kit
 * exports has a story, so people and agents can see it and how to use it.
 * Add the story (stories/<Component>.stories.tsx) in the same change as the
 * component.
 */

const kit = path.resolve(__dirname, "..");

/** PascalCase value exports of index.ts: the components. */
function exportedComponents(): string[] {
  const index = fs.readFileSync(path.join(kit, "index.ts"), "utf8");
  const names: string[] = [];
  for (const m of index.matchAll(/export\s*\{([^}]*)\}\s*from/g)) {
    for (const part of m[1].split(",")) {
      const p = part.trim();
      if (!p || p.startsWith("type ")) continue;
      const name = p.split(/\s+as\s+/).pop()!.trim();
      if (/^[A-Z]/.test(name)) names.push(name);
    }
  }
  return names;
}

/** Components named as `component` or `subcomponents` in the kit's stories. */
function storiedComponents(): Set<string> {
  const dir = path.join(kit, "stories");
  const covered = new Set<string>();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".stories.tsx"))) {
    const src = fs.readFileSync(path.join(dir, file), "utf8");
    for (const m of src.matchAll(/\bcomponent:\s*([A-Z]\w*)/g)) covered.add(m[1]);
    for (const m of src.matchAll(/subcomponents:\s*\{([^}]*)\}/g)) {
      for (const entry of m[1].split(",")) {
        const name = entry.split(":").pop()!.trim();
        if (/^[A-Z]/.test(name)) covered.add(name);
      }
    }
  }
  return covered;
}

describe("Genaro story coverage", () => {
  it("every exported component has a story", () => {
    const covered = storiedComponents();
    const missing = exportedComponents().filter((name) => !covered.has(name));
    expect(missing, `Add a story for: ${missing.join(", ")}`).toEqual([]);
  });
});
