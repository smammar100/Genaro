import * as React from "react";
import { Car, Code2, Layers, LayoutGrid, Palette, Type, Bot, Weight, Baseline, CaseSensitive, Server, Component } from "lucide-react";
import { Avatar, Badge, Button, KeyboardKey, ProgressBar, Tag } from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";

/**
 * Building blocks for the Introduction page. Everything here is drawn with
 * Genaro's own components and tokens; the words people and agents need are
 * written in Introduction.mdx itself.
 */

const surface: React.CSSProperties = {
  background: "var(--bg-surface)",
  borderRadius: "var(--radius-300)",
  boxShadow: "var(--shadow-300)",
};

/** Links from a docs page to another Storybook page, in the top window. */
function storyHref(id: string) {
  return `/?path=/docs/${id}`;
}

// ------------------------------------------------------------------ Hero

export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "var(--space-800)",
        alignItems: "center",
        padding: "var(--space-800)",
        margin: "var(--space-400) 0 var(--space-1000)",
        borderRadius: "var(--radius-500)",
        background: "var(--bg-surface-secondary)",
        backgroundImage: "radial-gradient(var(--border-secondary) 1px, transparent 1px)",
        backgroundSize: "var(--space-500) var(--space-500)",
        boxShadow: "inset 0 0 0 var(--border-width-025) var(--border-secondary)",
      }}
    >
      <div style={{ display: "grid", gap: "var(--space-400)" }}>{children}</div>
      <HeroIllustration />
    </div>
  );
}

/** Buttons that move the whole Storybook (not the docs frame) to a page. */
export function HeroActions() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-200)" }}>
      <a className="p-btn p-btn--primary p-btn--large" href={storyHref("components-actions-button--docs")} target="_top">
        <span className="p-btn__label">Browse components</span>
      </a>
      <a className="p-btn p-btn--secondary p-btn--large" href={storyHref("foundations-colour--docs")} target="_top">
        <span className="p-btn__label">Read the foundations</span>
      </a>
    </div>
  );
}

export function Stats() {
  const stats = [
    ["58", "components"],
    ["209", "colour tokens"],
    ["6", "type roles"],
    ["2", "themes"],
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-500)" }}>
      {stats.map(([n, label]) => (
        <div key={label}>
          <div className="heading-lg tabular-nums">{n}</div>
          <div className="body-sm" style={{ color: "var(--text-secondary)" }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A collage of real components: what the system builds. Decorative. */
function HeroIllustration() {
  const tilt = (deg: number): React.CSSProperties => ({ transform: `rotate(${deg}deg)` });
  return (
    <div aria-hidden inert style={{ position: "relative", height: 360, pointerEvents: "none", userSelect: "none" }}>
      {/* Vehicle card */}
      <div style={{ ...surface, ...tilt(-3), position: "absolute", left: 0, top: 8, width: 220, overflow: "hidden" }}>
        <div
          style={{
            height: 104,
            backgroundImage: "url(/cars/seed/vehicle-3.png)",
            backgroundSize: "cover",
            backgroundPosition: "50% 45%",
          }}
        />
        <div style={{ display: "grid", gap: "var(--space-150)", padding: "var(--space-300)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-200)" }}>
            <RegPlate registration="OY70 TZG" size="sm" />
            <Badge tone="success">Ready</Badge>
          </div>
          <div className="heading-sm">2014 Audi A4</div>
          <div className="body-sm" style={{ color: "var(--text-secondary)" }}>
            L-927 · Forecourt · 12d in stock
          </div>
          <div className="heading-sm tabular-nums">£16,419</div>
        </div>
      </div>

      {/* Appointment card */}
      <div style={{ ...surface, ...tilt(2.5), position: "absolute", right: 0, top: 0, width: 210, padding: "var(--space-300)", display: "grid", gap: "var(--space-200)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-200)" }}>
          <Avatar name="Priya Shah" size="sm" />
          <div>
            <div className="body-md" style={{ fontWeight: "var(--fw-semibold)" }}>
              Priya Shah
            </div>
            <div className="body-sm" style={{ color: "var(--text-secondary)" }}>
              Test drive · Sat 09:00
            </div>
          </div>
        </div>
        <ProgressBar progress={66} size="small" tone="success" />
        <Button variant="primary" size="micro" fullWidth>
          Book appointment
        </Button>
      </div>

      {/* Type and colour specimen */}
      <div style={{ ...surface, ...tilt(-1.5), position: "absolute", left: 24, bottom: 0, width: 200, padding: "var(--space-300)", display: "grid", gap: "var(--space-200)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-200)" }}>
          <span className="heading-lg">Aa</span>
          <span className="body-sm" style={{ color: "var(--text-secondary)" }}>
            Geist · 6 roles
          </span>
        </div>
        <div style={{ display: "flex", gap: "var(--space-100)" }}>
          {["--bg-fill-brand", "--bg-fill-info", "--bg-fill-success", "--bg-fill-caution", "--bg-fill-warning", "--bg-fill-critical", "--bg-fill-magic"].map((t) => (
            <span key={t} style={{ width: 20, height: 20, borderRadius: "var(--radius-full)", background: `var(${t})` }} />
          ))}
        </div>
      </div>

      {/* Mini pipeline */}
      <div style={{ ...surface, ...tilt(2), position: "absolute", right: 12, bottom: 16, width: 230, padding: "var(--space-300)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-200)" }}>
        {[
          ["New", 3, "info"],
          ["Test drive", 2, "attention"],
          ["Sold", 1, "success"],
        ].map(([lane, n, tone]) => (
          <div key={lane as string} style={{ display: "grid", gap: "var(--space-100)", alignContent: "start" }}>
            <div className="body-xs" style={{ color: "var(--text-secondary)" }}>
              {lane}
            </div>
            {Array.from({ length: n as number }, (_, i) => (
              <span key={i} style={{ height: 14, borderRadius: "var(--radius-100)", background: `var(--bg-fill-${tone === "attention" ? "caution" : tone}-secondary)` }} />
            ))}
          </div>
        ))}
      </div>

      {/* Floating details */}
      <div style={{ position: "absolute", left: "52%", top: 150, ...tilt(-6) }}>
        <Badge tone="info" size="large">
          Reserved
        </Badge>
      </div>
      <div style={{ position: "absolute", left: "38%", top: 70, ...tilt(4) }}>
        <Tag>Hybrid</Tag>
      </div>
      <div style={{ position: "absolute", right: 80, top: 200, ...tilt(-3) }}>
        <KeyboardKey>⌘K</KeyboardKey>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ What's inside

const TILES: Record<string, { icon: React.ReactNode; tone: string; href: string; visual: React.ReactNode }> = {
  Foundations: {
    icon: <Palette />,
    tone: "magic",
    href: storyHref("foundations-colour--docs"),
    visual: (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-200)" }}>
        <span className="heading-lg">Aa</span>
        {["--bg-fill-brand", "--bg-fill-info", "--bg-fill-success", "--bg-fill-caution"].map((t) => (
          <span key={t} style={{ width: 16, height: 16, borderRadius: "var(--radius-100)", background: `var(${t})` }} />
        ))}
      </div>
    ),
  },
  Components: {
    icon: <Component />,
    tone: "info",
    href: storyHref("components-actions-button--docs"),
    visual: (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-200)" }}>
        <Button size="micro" variant="primary">
          Save
        </Button>
        <Badge tone="success">Ready</Badge>
        <Tag>Diesel</Tag>
      </div>
    ),
  },
  Patterns: {
    icon: <LayoutGrid />,
    tone: "success",
    href: storyHref("patterns-kanban-board--docs"),
    visual: (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 48px)", gap: "var(--space-100)" }}>
        {[2, 3, 1].map((n, i) => (
          <div key={i} style={{ display: "grid", gap: "var(--space-050)" }}>
            {Array.from({ length: n }, (_, j) => (
              <span key={j} style={{ height: 8, borderRadius: "var(--radius-050)", background: "var(--bg-fill-tertiary)" }} />
            ))}
          </div>
        ))}
      </div>
    ),
  },
  Guides: {
    icon: <Code2 />,
    tone: "caution",
    href: storyHref("guides-writing-stories--docs"),
    visual: (
      <div style={{ display: "grid", gap: "var(--space-050)" }}>
        {[80, 120, 64].map((w, i) => (
          <span key={i} style={{ width: w, height: 6, borderRadius: "var(--radius-050)", background: "var(--bg-fill-tertiary)" }} />
        ))}
      </div>
    ),
  },
};

export function Tiles({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-400)", margin: "var(--space-400) 0 var(--space-1000)" }}>
      {children}
    </div>
  );
}

export function Tile({ title, children }: { title: keyof typeof TILES; children: React.ReactNode }) {
  const t = TILES[title];
  return (
    <a
      href={t.href}
      target="_top"
      style={{ ...surface, display: "grid", gap: "var(--space-300)", padding: "var(--space-400)", color: "var(--text)", textDecoration: "none" }}
    >
      <IconChip tone={t.tone}>{t.icon}</IconChip>
      <div className="heading-sm">{title}</div>
      <div className="body-md" style={{ color: "var(--text-secondary)" }}>
        {children}
      </div>
      <div style={{ marginTop: "auto", paddingTop: "var(--space-200)" }}>{t.visual}</div>
    </a>
  );
}

function IconChip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 32,
        height: 32,
        borderRadius: "var(--radius-200)",
        background: `var(--bg-fill-${tone}-secondary)`,
        color: `var(--icon-${tone === "magic" ? "magic" : tone})`,
      }}
      className="[&_svg]:size-4"
    >
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ Rules

const RULE_ICONS: Record<string, { icon: React.ReactNode; tone: string }> = {
  components: { icon: <Layers />, tone: "info" },
  tokens: { icon: <Palette />, tone: "magic" },
  type: { icon: <Type />, tone: "success" },
  typefaces: { icon: <Baseline />, tone: "caution" },
  weights: { icon: <Weight />, tone: "info" },
  colour: { icon: <CaseSensitive />, tone: "magic" },
  words: { icon: <Car />, tone: "success" },
  server: { icon: <Server />, tone: "caution" },
  agents: { icon: <Bot />, tone: "info" },
};

export function Rules({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-400)", margin: "var(--space-400) 0 var(--space-1000)" }}>
      {children}
    </div>
  );
}

export function Rule({ kind, title, example, children }: { kind: keyof typeof RULE_ICONS; title: string; example?: React.ReactNode; children: React.ReactNode }) {
  const r = RULE_ICONS[kind];
  return (
    <div style={{ ...surface, boxShadow: "var(--shadow-100)", display: "grid", gap: "var(--space-300)", padding: "var(--space-400)", alignContent: "start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-300)" }}>
        <IconChip tone={r.tone}>{r.icon}</IconChip>
        <div className="heading-sm">{title}</div>
      </div>
      <div className="body-md" style={{ color: "var(--text-secondary)" }}>
        {children}
      </div>
      {example ? (
        <div style={{ padding: "var(--space-300)", borderRadius: "var(--radius-200)", background: "var(--bg-surface-secondary)" }}>{example}</div>
      ) : null}
    </div>
  );
}

/** A do / don't pair for a rule card. */
export function DoDont({ good, bad }: { good: React.ReactNode; bad: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "var(--space-200)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-200)" }}>
        <Badge tone="success">Do</Badge>
        {good}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-200)" }}>
        <Badge tone="critical">Don&apos;t</Badge>
        <span style={{ textDecoration: "line-through", textDecorationColor: "var(--text-critical)" }}>{bad}</span>
      </div>
    </div>
  );
}

export function WeightsExample() {
  return (
    <div style={{ display: "flex", gap: "var(--space-500)", alignItems: "baseline" }}>
      {[
        ["Regular", "--fw-regular"],
        ["Medium", "--fw-medium"],
        ["Semibold", "--fw-semibold"],
      ].map(([label, t]) => (
        <div key={t}>
          <div className="heading-lg" style={{ fontWeight: `var(${t})` }}>
            Aa
          </div>
          <div className="body-sm" style={{ color: "var(--text-secondary)" }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TypeLadder() {
  const roles = [
    ["display", 24],
    ["title", 16],
    ["subtitle", 14],
    ["body", 13],
    ["caption", 12],
    ["micro", 11],
  ] as const;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-300)" }}>
      {roles.map(([role]) => (
        <div key={role} style={{ textAlign: "center" }}>
          <div style={{ fontSize: `var(--fs-${role})`, lineHeight: `var(--lh-${role})`, fontWeight: "var(--fw-semibold)" }}>Aa</div>
          <div className="body-xs" style={{ color: "var(--text-secondary)" }}>
            {role}
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Agents

export function AgentPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="dark"
      style={{
        display: "grid",
        gap: "var(--space-300)",
        padding: "var(--space-600)",
        margin: "var(--space-400) 0 var(--space-800)",
        borderRadius: "var(--radius-400)",
        background: "var(--bg-surface)",
        color: "var(--text)",
        boxShadow: "var(--shadow-400)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-300)" }}>
        <IconChip tone="info">
          <Bot />
        </IconChip>
        <div className="heading-sm">For coding agents</div>
      </div>
      <div className="body-md" style={{ color: "var(--text-secondary)" }}>
        {children}
      </div>
      <pre className="font-mono body-sm" style={{ margin: 0, padding: "var(--space-300)", borderRadius: "var(--radius-200)", background: "var(--bg-surface-secondary)", overflowX: "auto" }}>
        {`pnpm storybook\n# MCP server   http://localhost:6006/mcp\n# Manifests    storybook-static/manifests/components.json, docs.json`}
      </pre>
    </div>
  );
}
