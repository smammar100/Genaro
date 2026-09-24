/**
 * Generate src/app/polaris-theme.css from Shopify's official Polaris tokens.
 *
 *   node scripts/build-polaris-theme.mjs
 *
 * Why generated: the values must be Polaris's, not our approximation of them.
 * `@shopify/polaris-tokens` (MIT) is the maintained source; Polaris React is
 * deprecated and React-18-only, and the Polaris web components are meant for
 * apps inside the Shopify admin — so the app keeps its own components and
 * takes Polaris's visual language (shell, page, tables, buttons, type) from
 * the tokens instead.
 *
 * Output: one `.polaris` class (set on <html> by the root layout) that
 * re-points the app's semantic tokens and the Tailwind type/radius scale at
 * Polaris's light theme (with the live admin's measured values on top), plus
 * the generic rules for cards, form fields and index tables. The shell, nav
 * and buttons style themselves in their components. Re-run after upgrading
 * the package; commit the output.
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { themes } = require("@shopify/polaris-tokens");
const p = Object.assign({}, ...Object.values(themes.light));

const t = (k) => {
  if (!(k in p)) throw new Error(`Polaris token missing: ${k}`);
  return p[k];
};
/** A Polaris text style as Tailwind's --text-* size + line-height pair. */
const textStep = (name, style) => ({
  [`--text-${name}`]: t(`text-${style}-font-size`),
  [`--text-${name}--line-height`]: t(`text-${style}-font-line-height`),
  [`--text-${name}--letter-spacing`]: t(`text-${style}-font-letter-spacing`),
});

/**
 * Measured from the live Shopify admin (admin.shopify.com, Sep 2026) — its
 * current shell has moved on from the published v9 tokens: near-black text,
 * a 16px-radius white panel inset 4px on #1B1B1B, 30px nav rows, hairline
 * #DDDDDD cards. These win over the token values where they differ.
 */
const ADMIN = {
  ground: "#1b1b1b",
  panel: "#ffffff",
  panelRadius: "1rem",
  panelGap: "0.25rem",
  text: "#101010",
  textSecondary: "#4a4a4a",
  navText: "rgba(255, 255, 255, 0.82)",
  navTextActive: "#f7f7f7",
  navSubText: "#a6a6a6",
  navHeading: "#8c8c8c",
  navActiveBg: "rgba(255, 255, 255, 0.1)",
  navHoverBg: "rgba(255, 255, 255, 0.06)",
  navRowHeight: "1.875rem",
  navRowRadius: "0.75rem",
  navLetterSpacing: "-0.01em",
  cardBorder: "#e3e3e3",
  inputBorder: "#8a8a8a",
  inputBorderHover: "#616161",
  focus: "#005bd3",
  cardRadius: "0.75rem",
  buttonHeight: "2rem",
  buttonPadding: "0.75rem",
  railWidth: "13.75rem",
  railInset: "0.5rem",
  sectionRowHeight: "1.5rem",
  sectionRowRadius: "0.5rem",
};

const TOKENS = {
  // ── Colour: semantic (Tailwind / shadcn) ─────────────────────────────
  "--background": t("color-bg"),
  "--foreground": ADMIN.text,
  "--card": t("color-bg-surface"),
  "--card-foreground": ADMIN.text,
  "--popover": t("color-bg-surface"),
  "--popover-foreground": ADMIN.text,
  "--primary": ADMIN.text,
  "--primary-foreground": t("color-text-brand-on-bg-fill"),
  "--secondary": t("color-bg-fill-secondary"),
  "--secondary-foreground": t("color-text"),
  "--muted": t("color-bg-surface-secondary"),
  "--muted-foreground": ADMIN.textSecondary,
  "--accent": t("color-bg-surface-hover"),
  "--accent-foreground": t("color-text"),
  "--destructive": t("color-bg-fill-critical"),
  "--destructive-foreground": t("color-text-critical"),
  "--success": t("color-bg-fill-success"),
  "--success-foreground": t("color-text-success"),
  "--warning": t("color-bg-fill-caution"),
  "--warning-foreground": t("color-text-caution"),
  "--info": t("color-bg-fill-info"),
  "--info-foreground": t("color-text-info"),
  "--border": ADMIN.cardBorder,
  "--input": t("color-input-border"),
  "--ring": t("color-border-focus"),

  // ── Shape ─────────────────────────────────────────────────────────────
  "--radius": t("border-radius-200"),
  "--radius-sm": t("border-radius-100"),
  "--radius-md": t("border-radius-200"),
  "--radius-lg": t("border-radius-200"),
  "--radius-xl": t("border-radius-300"),
  "--radius-2xl": t("border-radius-300"),

  // ── Typography: Tailwind's scale re-pointed at Polaris text styles ────
  "--font-sans": `var(--font-inter), ${t("font-family-sans")}`,
  ...textStep("2xs", "body-xs"),
  ...textStep("xs", "body-sm"),
  ...textStep("sm", "body-md"),
  ...textStep("base", "body-lg"),
  ...textStep("lg", "heading-md"),
  ...textStep("xl", "heading-lg"),
  // Page titles are `text-2xl` across the app → Polaris Page title.
  ...textStep("2xl", "heading-lg"),
  ...textStep("3xl", "heading-xl"),
  "--font-weight-normal": t("font-weight-regular"),
  "--font-weight-medium": t("font-weight-medium"),
  "--font-weight-semibold": t("font-weight-semibold"),
  "--font-weight-bold": t("font-weight-bold"),

  // ── Nav rail: the Shopify admin's dark, full-height rail ──────────────
  "--sidebar": ADMIN.ground,
  "--sidebar-foreground": t("color-text-inverse"),
  "--sidebar-primary": t("color-bg-fill-inverse-hover"),
  "--sidebar-primary-foreground": t("color-text-inverse"),
  "--sidebar-accent": t("color-bg-fill-inverse"),
  "--sidebar-accent-foreground": t("color-text-brand-on-bg-fill"),
  "--sidebar-border": t("color-border-inverse"),
  "--sidebar-ring": t("color-border-focus"),
  "--color-nav-item": ADMIN.navText,
  "--color-nav-heading": ADMIN.navHeading,
  "--color-nav-email": t("color-text-inverse-secondary"),
  "--color-nav-mark": t("color-bg-fill-inverse-hover"),

};

const decl = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");

const css = `/* GENERATED by scripts/build-polaris-theme.mjs from @shopify/polaris-tokens —
   do not edit by hand; change the script and re-run it.

   .polaris (on <html>) gives the whole app Shopify Polaris's visual
   colour scheme and type, plus cards, form fields and index tables. The
   shell, nav and buttons style themselves in their components. */

.polaris {
${decl(TOKENS)}
  font-family: var(--font-sans);
  font-size: ${t("text-body-md-font-size")};
  line-height: ${t("text-body-md-font-line-height")};
  color: var(--foreground);
}

/* ── Page content: Polaris Page — titles are heading-lg ─────────────── */
.polaris [data-page-shell] h1 {
  font-size: ${t("text-heading-lg-font-size")};
  line-height: ${t("text-heading-lg-font-line-height")};
  font-weight: ${t("text-heading-lg-font-weight")};
  letter-spacing: ${t("text-heading-lg-font-letter-spacing")};
}

/* ── Cards: Shopify admin cards — white, 12px radius, #E3E3E3 hairline,
   a faint 1px bottom shadow ─────────────────────────────────────────── */
.polaris [data-slot="card"] {
  border: 1px solid ${ADMIN.cardBorder};
  border-radius: ${ADMIN.cardRadius};
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
}

/* ── Form fields: Shopify admin fields ────────────────────────────────── */
.polaris [data-slot="input-control"],
.polaris [data-slot="select-trigger"],
.polaris [data-slot="select-button"],
.polaris [data-slot="textarea-control"] {
  background-color: ${t("color-bg-surface")};
  border-color: ${ADMIN.inputBorder};
  border-radius: ${t("border-radius-200")};
  box-shadow: none;
}
.polaris [data-slot="input-control"]:hover,
.polaris [data-slot="select-trigger"]:hover,
.polaris [data-slot="textarea-control"]:hover {
  border-color: ${ADMIN.inputBorderHover};
}
.polaris [data-slot="input-control"]:focus-within,
.polaris [data-slot="select-trigger"]:focus-visible,
.polaris [data-slot="textarea-control"]:focus-within {
  border-color: ${ADMIN.focus};
  box-shadow: 0 0 0 1px ${ADMIN.focus};
}

/* ── Type: Shopify never shouts. The old Genaro labels were mono capitals;
   the admin's are sentence-case Inter. ─────────────────────────────────── */
.polaris .uppercase {
  text-transform: none;
  letter-spacing: normal;
}
.polaris .font-mono.uppercase,
.polaris .uppercase.font-mono {
  font-family: var(--font-sans);
}

/* ── Tables: Shopify admin index / data tables ──────────────────────────
   Measured from admin.shopify.com (Analytics → Reports, Sep 2026): a grey
   #F7F7F7 header row with 12px/500 #4A4A4A labels and no rules; body rows
   divided by a single #DDDDDD hairline, 13px #101010 text, 6px cell padding
   (12px on the first column), no zebra striping and no vertical rules.
   Applies to every <table> — plain tables and the index grids alike. */
.polaris table {
  border-collapse: separate;
  border-spacing: 0;
}
.polaris table thead th {
  background-color: #f7f7f7;
  color: #4a4a4a;
  font-size: 0.75rem;
  line-height: 1.25rem;
  font-weight: 500;
  text-transform: none;
  letter-spacing: normal;
  padding-block: 0.5rem;
  border-width: 0;
  border-color: transparent;
}
.polaris table thead th button,
.polaris table thead th span {
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
}
.polaris table tbody td {
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: #101010;
  padding-block: 0.375rem;
  border-width: 1px 0 0 0;
  border-style: solid;
  border-color: #dddddd;
}
.polaris table th:first-child,
.polaris table td:first-child {
  padding-inline-start: 0.75rem;
}
/* Zebra striping off — Shopify separates rows with the hairline alone. */
.polaris table tbody tr[class*="even:"]:nth-child(even),
.polaris table tbody tr[class*="odd:"]:nth-child(odd) {
  background-color: transparent;
}
.polaris table tbody tr:hover > td {
  background-color: #f7f7f7;
}
.polaris table tbody tr[data-state="selected"] > td,
.polaris table tbody tr[aria-selected="true"] > td {
  background-color: #f1f1f1;
}
`;

writeFileSync(new URL("../src/app/polaris-theme.css", import.meta.url), css);
console.log(`polaris-theme.css: ${Object.keys(TOKENS).length} tokens`);
