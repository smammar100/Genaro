import tokens from "@/components/genaro/styles/tokens.json";

type Theme = "light" | "dark";
type TokenValue = string | { light: string; dark: string };

const byName = new Map<string, TokenValue>(
  (tokens.color.tokens as { name: string; value: TokenValue }[]).map((t) => [t.name, t.value]),
);

/**
 * A Genaro colour token's value in one theme, with `{gray-16}` style references
 * followed to the colour itself. For the few places a CSS variable can't reach,
 * like the `theme-color` meta tag that tints the phone's status bar.
 */
export function tokenColor(name: string, theme: Theme): string {
  const value = byName.get(name);
  if (value === undefined) throw new Error(`Unknown colour token: ${name}`);
  const raw = typeof value === "string" ? value : value[theme];
  const ref = raw.match(/^\{(.+)\}$/);
  return ref ? tokenColor(ref[1], theme) : raw;
}
