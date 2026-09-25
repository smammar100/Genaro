#!/usr/bin/env node
/*
 * Polaris design-system audit — finds code that bypasses the system.
 *
 *   node components/polaris/tools/audit.mjs [paths…] [--json] [--quiet]
 *
 * Paths default to app/, src/ and components/ (the kit itself, shadcn's components/ui, node_modules, .next and build
 * output are skipped; pass --include-vendor to audit components/ui too).
 * Exit code 1 when any "error" is found, so it can run in CI or a pre-commit hook.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const quiet = args.includes('--quiet');
const includeVendor = args.includes('--include-vendor');
const targets = args.filter((a) => !a.startsWith('--'));
const roots = targets.length ? targets : ['app', 'src', 'components'].filter((p) => fs.existsSync(p));

// ---------- tokens ----------
const tokensPath = [path.join(here, '../styles/tokens.json'), 'components/polaris/styles/tokens.json', 'src/components/polaris/styles/tokens.json'].find((p) => fs.existsSync(p));
const TOKENS = new Set();
const PRIMITIVE = /^(gray|azure|blue|green|lime|red|rose|orange|yellow|purple|magenta|teal|cyan|indigo|black-alpha|white-alpha)-\d+$/;
if (tokensPath) {
  const t = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  for (const f of ['color', 'spacing', 'radius', 'shadow', 'borderWidth', 'size']) for (const x of t[f]?.tokens || []) TOKENS.add(x.name);
  TOKENS.add('font-sans'); TOKENS.add('font-mono');
}
const POLARIS_PREFIX = /^(bg|text|icon|border|input|nav|shadow|space|radius|font|backdrop|scale|width|height|border-width)(-|$)/;
const FOREIGN_VARS = /^(tw-|color-|font-inter|font-geist|font-heading|font-serif|background$|foreground$|card|popover|primary|secondary|muted|accent|destructive|input$|ring$|radius$|radius-(xs|sm|md|lg|xl|\dxl)$|shadow-(2xs|xs|sm|md|lg|xl|2xl)$|text-(xs|sm|base|lg|xl|\dxl)$|chart-|sidebar|spacing$|p-|ex-|default-)/;

// ---------- files ----------
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'out', '.turbo', 'coverage']);
const EXT = /\.(tsx|ts|jsx|js|css|scss|mdx)$/;
function walk(p, out) {
  if (!fs.existsSync(p)) return out;
  const st = fs.statSync(p);
  if (st.isFile()) { if (EXT.test(p)) out.push(p); return out; }
  for (const name of fs.readdirSync(p)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(p, name);
    if (/(^|\/)components\/polaris(\/|$)/.test(full) || /polaris-examples/.test(full)) continue;
    if (!includeVendor && /(^|\/)components\/ui(\/|$)/.test(full)) continue;
    walk(full, out);
  }
  return out;
}
const files = roots.flatMap((r) => walk(r, []));

// ---------- rules ----------
const PALETTE = '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)';
const UTIL = '(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|placeholder|decoration|shadow|accent|caret|border-[trblxy])';
const reTwPalette = new RegExp(`(?<![\\w-])(?:[a-z-]+:)*${UTIL}-${PALETTE}(?:-\\d{2,3})?(?:\\/\\d+)?(?![\\w-])`, 'g');
const reTwArbitraryColor = /(?<![\w-])(?:[a-z-]+:)*[a-z-]+-\[(?:#|rgb|hsl|oklch)[^\]]*\]/g;
const reDarkColor = new RegExp(`(?<![\\w-])dark:${UTIL}-[\\w\\[\\(\\]\\)#/.-]+`, 'g');
const reQuotedHex = /(['"`])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\1/g;
const reCssHex = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const reColorFn = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
const reVar = /var\(--([\w-]+)|(?<![\w-])[a-z-]+-\(--([\w-]+)\)/g;
const reRawControl = /<(button|select|textarea|table)\b|<input\b(?![^>]*type=["']hidden)/g;
const reInlinePx = /\b(padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingInline|paddingBlock|margin|marginTop|marginBottom|marginLeft|marginRight|gap|rowGap|columnGap|borderRadius|border-radius|padding-[a-z]+|margin-[a-z]+|row-gap|column-gap)\s*:\s*['"]?(\d+(?:\.\d+)?)(px)?\b/g;
const reFontFamily = /font-?family\s*:\s*(?!\s*var\(--font-|\s*inherit)/gi;
const reEmoji = /\p{Extended_Pictographic}/gu;
const PROPER = new Set(['Shopify', 'Polaris', 'Sidekick', 'Google', 'Facebook', 'Instagram', 'TikTok', 'Pinterest', 'YouTube', 'Point', 'Sale', 'Online', 'Store', 'POS', 'SKU', 'ID', 'URL', 'CSV', 'PDF', 'API', 'USD', 'EUR', 'CAD', 'GST', 'VAT', 'HST', 'OK', 'Apple', 'Pay', 'PayPal', 'Stripe', 'Flow', 'Shop', 'Canada', 'United', 'States', 'Kingdom', 'App', 'Balance', 'Markets', 'Plus']);

const issues = [];
function add(file, line, severity, rule, message, fix) { issues.push({ file, line, severity, rule, message, fix }); }
function pxToken(px) {
  const n = Number(px);
  const map = { 0: 'space-0', 1: 'space-025', 2: 'space-050', 4: 'space-100', 6: 'space-150', 8: 'space-200', 12: 'space-300', 16: 'space-400', 20: 'space-500', 24: 'space-600', 28: 'space-700', 32: 'space-800', 40: 'space-1000', 48: 'space-1200', 64: 'space-1600' };
  return map[n] ? `var(--${map[n]})` : 'a space-* token';
}
function titleCaseWords(s) {
  const words = s.trim().split(/\s+/);
  if (words.length < 2 || /\d/.test(s)) return [];
  return words.filter((w, i) => i > 0 && !/[:.]$/.test(words[i - 1]) && /^[A-Z][a-z]{2,}$/.test(w) && !PROPER.has(w));
}

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const isCss = /\.(css|scss)$/.test(file);
  const isTsx = /\.(tsx|jsx)$/.test(file);
  const lines = src.split('\n');
  let primaries = 0;
  lines.forEach((text, i) => {
    const ln = i + 1;
    if (/audit-ignore/.test(text)) return;
    const code = text.replace(/\/\/.*$/, '');
    // colors
    for (const m of code.matchAll(reTwPalette)) add(file, ln, 'error', 'tailwind-palette', `Tailwind palette color "${m[0]}" bypasses the theme.`, 'Use a token: bg-(--bg-surface), text-(--text-secondary), border-(--border)… (see references/tokens.md).');
    for (const m of code.matchAll(reTwArbitraryColor)) add(file, ln, 'error', 'arbitrary-color', `Hard-coded color "${m[0]}".`, 'Use a semantic token with the var shorthand, e.g. bg-(--bg-fill-critical).');
    for (const m of code.matchAll(reDarkColor)) add(file, ln, 'warn', 'dark-variant', `"${m[0]}" — dark-mode overrides aren't needed; tokens switch with the theme.`, 'Remove the dark: utility and use the semantic token for both themes.');
    if (isCss) for (const m of code.matchAll(reCssHex)) add(file, ln, 'error', 'hex-color', `Hex color ${m[0]}.`, 'Use var(--<semantic token>).');
    else if (/(color|background|fill|stroke|border[A-Za-z]*|shadow|outline|style)\s*[:=]/i.test(code)) for (const m of code.matchAll(reQuotedHex)) add(file, ln, 'error', 'hex-color', `Hex color ${m[0]}.`, 'Use var(--<semantic token>).');
    if (reColorFn.test(code) && !/--[\w-]+\s*:/.test(code)) add(file, ln, 'warn', 'color-function', 'Raw color function (rgb/hsl/oklch…).', 'Use a semantic color token instead.');
    reColorFn.lastIndex = 0;
    // tokens
    for (const m of code.matchAll(reVar)) {
      const name = m[1] || m[2];
      if (!name || FOREIGN_VARS.test(name)) continue;
      if (PRIMITIVE.test(name)) add(file, ln, 'error', 'primitive-token', `Primitive token --${name} used directly.`, 'Use the semantic token that aliases it (bg-*, text-*, border-*, icon-*).');
      else if (TOKENS.size && POLARIS_PREFIX.test(name) && !TOKENS.has(name)) add(file, ln, 'error', 'unknown-token', `--${name} is not a Polaris token.`, 'Check the name in references/tokens.md or components/polaris/styles/tokens.css.');
    }
    // spacing / radius in px
    for (const m of code.matchAll(reInlinePx)) {
      if (Number(m[2]) === 0) continue;
      if (/--[\w-]+\s*:/.test(code)) continue;
      add(file, ln, 'warn', 'hardcoded-spacing', `${m[1]}: ${m[2]}${m[3] || ''} is hard-coded.`, /radius/i.test(m[1]) ? 'Use var(--radius-200) / var(--radius-300)…' : `Use ${pxToken(m[2])} (or the Tailwind scale: p-4 = space-400).`);
    }
    for (const m of code.matchAll(reFontFamily)) add(file, ln, 'warn', 'font-family', 'Custom font-family.', 'Polaris uses Inter via var(--font-sans); use the type classes (body-md, heading-sm…).');
    if (isTsx) {
      for (const m of code.matchAll(reRawControl)) add(file, ln, 'warn', 'raw-control', `Raw <${m[1] || 'input'}> element.`, 'Use the Polaris component (Button, TextField, Select, Checkbox, IndexTable/DataTable…) so states, focus and theming come for free.');
      if (/variant=["']primary["']/.test(code)) primaries += (code.match(/variant=["']primary["']/g) || []).length;
      if (/\bprimaryAction=\{/.test(code)) primaries += 1;
      if (/<Button\b[^>]*\bicon=/.test(code) && /\/>\s*$/.test(code.trim()) && !/accessibilityLabel=/.test(code) && !/<Button\b[^>]*>[^<]+</.test(code)) {
        add(file, ln, 'error', 'icon-button-label', 'Icon-only Button without accessibilityLabel.', 'Add accessibilityLabel="…" (e.g. "Edit").');
      }
      for (const m of code.matchAll(/<Button\b[^>]*>([^<{]+)<\/Button>|content:\s*'([^']+)'/g)) {
        const label = (m[1] || m[2] || '').trim();
        const bad = titleCaseWords(label);
        if (bad.length) add(file, ln, 'warn', 'sentence-case', `"${label}" looks Title Case.`, 'Use sentence case ("Add product") unless these are proper nouns: ' + bad.join(', '));
      }
      for (const m of code.matchAll(reEmoji)) { add(file, ln, 'warn', 'emoji', `Emoji "${m[0]}" in UI text.`, 'Polaris UI uses no emoji; use an Icon if a glyph is needed.'); break; }
    }
  });
  if (isTsx && primaries > 1) add(file, 1, 'warn', 'multiple-primary', `${primaries} primary actions in one file.`, 'Keep one primary action per view or section; make the others secondary (default) or tertiary.');
  if (/(^|\/)(page|layout)\.(tsx|jsx)$/.test(file) && /^\s*['"]use client['"]/.test(src)) add(file, 1, 'info', 'client-page', 'This page/layout is a Client Component.', 'Keep pages as Server Components; move state and callbacks into a small client component.');
}

// ---------- report ----------
const order = { error: 0, warn: 1, info: 2 };
issues.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || order[a.severity] - order[b.severity]);
const counts = issues.reduce((c, i) => ((c[i.severity] = (c[i.severity] || 0) + 1), c), {});
if (asJson) {
  console.log(JSON.stringify({ files: files.length, counts, issues }, null, 2));
} else {
  let last = '';
  for (const i of issues) {
    if (quiet && i.severity === 'info') continue;
    if (i.file !== last) { console.log(`\n${i.file}`); last = i.file; }
    console.log(`  ${String(i.line).padStart(4)}  ${i.severity.padEnd(5)}  ${i.rule.padEnd(18)} ${i.message}\n${' '.repeat(33)}→ ${i.fix}`);
  }
  console.log(`\nPolaris audit: ${files.length} files, ${counts.error || 0} errors, ${counts.warn || 0} warnings, ${counts.info || 0} notes${tokensPath ? '' : ' (tokens.json not found — token names not checked)'}.`);
}
process.exit(counts.error ? 1 : 0);
