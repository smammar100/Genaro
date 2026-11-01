type TypeScaleVariant = "default" | "compact";

/** One role at one ladder step, in px. */
interface TypeScalePair {
  size: number;
  leading: number;
}

/** One role's font size at each ladder step, in px. */
interface TypeScaleStep {
  default: number;
  compact: number;
}

// Five sizes for the whole app, each with one line height (call 2026-11-01;
// title, subtitle, body and caption retuned the same day).
// The compact step keeps the same sizes: dense screens tighten their rows and
// controls (size-context), not their type, so the app never renders more
// than these five.
const display = { size: 24, leading: 30 };
const title = { size: 16, leading: 24 };
const subtitle = { size: 14, leading: 20 };
const body = { size: 13, leading: 18 };
const caption = { size: 12, leading: 16 };

const typeStyles = {
  /** Page titles and big figures. */
  display: { default: display, compact: display },
  /** Section headings, dialog and drawer titles. */
  title: { default: title, compact: title },
  /** Sub-headings and card titles. */
  subtitle: { default: subtitle, compact: subtitle },
  /** Labels, menu items, and paragraphs. Its 18px line box puts a padded row
   *  on the ladder: 9 + 18 + 9 = 36, 5 + 18 + 5 = 28. */
  body: { default: body, compact: body },
  /** Descriptions, meta rows, table headers, badges, counters and keys. */
  caption: { default: caption, compact: caption },
} as const satisfies Record<string, Record<TypeScaleVariant, TypeScalePair>>;

type TypeScaleRole = keyof typeof typeStyles;

const typeScaleRoles = Object.keys(typeStyles) as TypeScaleRole[];

/** Font sizes alone, per role and step: the shape `typeScale` has always
 *  had, for code that reads it as numbers. */
const typeScale = Object.fromEntries(
  typeScaleRoles.map((role) => [
    role,
    { default: typeStyles[role].default.size, compact: typeStyles[role].compact.size },
  ])
) as Record<TypeScaleRole, TypeScaleStep>;

// Class strings per role (size + leading), the same at both steps. Arbitrary
// values over the CSS variables, with the px values as fallbacks, so a
// component renders the right size even where the tokens were never
// installed, and stock tailwind-merge reads them as font-size / line-height
// (a bare `text-caption` would be taken for a color and dropped next to
// `text-muted-foreground`). Literal strings on purpose: Tailwind only
// generates classes it can read in source.
// <generated:type-classes>
const roleClasses = {
  display: "text-[length:var(--fs-display,24px)] leading-[var(--lh-display,30px)]",
  title: "text-[length:var(--fs-title,16px)] leading-[var(--lh-title,24px)]",
  subtitle: "text-[length:var(--fs-subtitle,14px)] leading-[var(--lh-subtitle,20px)]",
  body: "text-[length:var(--fs-body,13px)] leading-[var(--lh-body,18px)]",
  caption: "text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]",
} as const;

const typeClasses = {
  default: roleClasses,
  compact: roleClasses,
} as const satisfies Record<TypeScaleVariant, Record<TypeScaleRole, string>>;

// </generated:type-classes>

/** The class string for one role at one step (size + leading). */
function typeClass(role: TypeScaleRole, variant: TypeScaleVariant = "default"): string {
  return typeClasses[variant][role];
}

/** Editable fields add this after their role. iOS Safari zooms the page into
 *  a focused field set under 16px, so touch screens get 16px. It sets the
 *  size only: the role's leading and the field's fixed height stay, and
 *  desktop keeps the role. `useSize().field` is body plus this. */
const fieldTouchClass = "pointer-coarse:text-[16px]";

export { typeStyles, typeScale, typeScaleRoles, typeClasses, typeClass, fieldTouchClass };
export type { TypeScaleRole, TypeScaleVariant, TypeScalePair, TypeScaleStep };
