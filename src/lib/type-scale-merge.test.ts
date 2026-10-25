import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn with the type scale", () => {
  it("keeps a role next to a text colour", () => {
    // Stock tailwind-merge reads text-body as a colour and drops it here.
    expect(cn("text-body text-(--text-secondary)")).toBe("text-body text-(--text-secondary)");
    expect(cn("text-caption text-muted-foreground")).toBe("text-caption text-muted-foreground");
  });

  it("lets the later role win, as with any font size", () => {
    expect(cn("text-caption", "text-body")).toBe("text-body");
    expect(cn("text-title font-semibold", "text-subtitle")).toBe("font-semibold text-subtitle");
  });
});
