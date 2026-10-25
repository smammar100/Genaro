import * as React from "react";

/**
 * Display helpers for the Foundations pages. Every value they show is written
 * out in the MDX itself (by tools/foundations.mjs), so the docs manifest and
 * the page carry the same facts.
 */

const cell: React.CSSProperties = {
  padding: "var(--space-200) var(--space-300)",
  borderBottom: "var(--border-width-025) solid var(--border-secondary)",
  verticalAlign: "top",
  textAlign: "left",
};

export function TokenTable({ preview = "Preview", children }: { preview?: string; children: React.ReactNode }) {
  return (
    <table className="body-md" style={{ width: "100%", borderCollapse: "collapse", margin: "var(--space-300) 0 var(--space-600)" }}>
      <thead className="body-sm" style={{ color: "var(--text-secondary)" }}>
        <tr>
          <th style={cell}>{preview}</th>
          <th style={cell}>Token</th>
          <th style={cell}>Value</th>
          <th style={cell}>Use it for</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

type Kind = "color" | "space" | "radius" | "shadow" | "border";

function Sample({ kind, token }: { kind: Kind; token: string }) {
  const v = `var(${token})`;
  const box: React.CSSProperties = { width: 48, height: 32, borderRadius: "var(--radius-200)" };
  if (kind === "color") {
    return <div style={{ ...box, background: v, boxShadow: "inset 0 0 0 var(--border-width-025) var(--border-secondary)" }} />;
  }
  if (kind === "space") {
    return <div style={{ width: v, height: 16, background: "var(--bg-fill-brand)", borderRadius: "var(--radius-050)" }} />;
  }
  if (kind === "radius") {
    return <div style={{ ...box, borderRadius: v, background: "var(--bg-fill-secondary)", boxShadow: "inset 0 0 0 var(--border-width-025) var(--border)" }} />;
  }
  if (kind === "border") {
    return <div style={{ width: 48, borderTop: `${v} solid var(--border-emphasis)`, marginTop: 14 }} />;
  }
  return <div style={{ ...box, background: "var(--bg-surface)", boxShadow: v }} />;
}

export function TokenRow({
  kind,
  token,
  value,
  dark,
  usage,
}: {
  kind: Kind;
  token: string;
  value: string;
  /** Dark-theme value, when it differs. */
  dark?: string;
  usage: string;
}) {
  return (
    <tr>
      <td style={cell}>
        <Sample kind={kind} token={token} />
      </td>
      <td style={cell}>
        <code>{token}</code>
      </td>
      <td style={{ ...cell, color: "var(--text-secondary)", maxWidth: 220, overflowWrap: "anywhere" }} className="body-sm">
        {dark ? (
          <>
            Light {value}
            <br />
            Dark {dark}
          </>
        ) : (
          value
        )}
      </td>
      <td style={cell}>{usage}</td>
    </tr>
  );
}

/** One primitive ramp (gray-1 … gray-16) as a strip of swatches. */
export function Ramp({ name, steps }: { name: string; steps: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-300)", margin: "var(--space-100) 0" }}>
      <code style={{ width: 80 }}>{name}</code>
      <div style={{ display: "flex", flex: 1 }}>
        {Array.from({ length: steps }, (_, i) => (
          <div key={i} title={`--${name}-${i + 1}`} style={{ flex: 1, height: 28, background: `var(--${name}-${i + 1})` }} />
        ))}
      </div>
    </div>
  );
}
