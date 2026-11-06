import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Two projects:
 *  - unit:      node env, pure logic + services (src/lib/**, src/app/api/**)
 *  - component: jsdom env, React components (src/components/**), hooks
 *               (src/hooks/**) and a page's own client components
 *               (src/app/**\/*.test.tsx), all of which need a DOM
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Server-only guard is a no-op outside Next's bundler.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/lib/**/*.test.ts", "src/app/api/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          // Hooks had no test path at all before GEN-68 — a `src/hooks`
          // test file simply wasn't picked up by either project.
          include: ["src/components/**/*.test.tsx", "src/hooks/**/*.test.ts", "src/app/**/*.test.tsx"],
          setupFiles: ["src/test/setup-component.ts"],
        },
      },
    ],
  },
});
