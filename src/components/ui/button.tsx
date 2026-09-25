"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Loader2 } from "lucide-react";
import { cn, hitTarget } from "@/lib/utils";
import { resolveRender } from "@/lib/as-child";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

/**
 * Button — the Polaris Button, drawn with the kit's own `p-btn` classes
 * (src/components/polaris/styles/components.css) so it matches the Polaris
 * component exactly: 28px tall, radius-200, 12px medium text, bevelled
 * shadows, 2px focus outline, and every colour from the theme tokens.
 *
 * Same API as before, so every call site — including `render` / `asChild`
 * (e.g. <Button render={<Link/>}>) — keeps working unchanged:
 *   default → primary · secondary / outline → secondary · ghost → tertiary
 *   link → plain · destructive → primary critical
 *   destructive-outline → secondary critical
 * Sizes: xs = micro (24px) · sm / default = medium (28px) · lg = large (32px).
 */
const buttonVariants = cva(
  [
    "p-btn gap-1",
    "aria-disabled:pointer-events-none aria-disabled:bg-(--bg-fill-disabled) aria-disabled:text-(--text-disabled) aria-disabled:shadow-none",
    "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    defaultVariants: { size: "default", variant: "default" },
    variants: {
      size: {
        default: "",
        icon: "p-btn--icon-only size-7",
        "icon-lg": "p-btn--large p-btn--icon-only size-8",
        "icon-sm": `p-btn--icon-only size-7 ${hitTarget}`,
        "icon-xl": "p-btn--large p-btn--icon-only size-9",
        "icon-xs": `p-btn--micro p-btn--icon-only size-6 ${hitTarget}`,
        lg: "p-btn--large",
        sm: hitTarget,
        xl: "p-btn--large min-h-9 px-4",
        xs: `p-btn--micro ${hitTarget}`,
      },
      variant: {
        default: "p-btn--primary",
        destructive: "p-btn--primary p-btn--tone-critical",
        "destructive-outline": "p-btn--secondary p-btn--tone-critical",
        ghost: "p-btn--tertiary",
        link: "p-btn--plain",
        outline: "p-btn--secondary",
        secondary: "p-btn--secondary",
      },
    },
  },
);

type AppVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type AppSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

interface ButtonProps extends useRender.ComponentProps<"button"> {
  variant?: AppVariant;
  size?: AppSize;
  loading?: boolean;
  asChild?: boolean;
  /** Stretch the button to fill the available inline space. */
  expand?: boolean;
}

export function Button(props: ButtonProps): React.ReactElement {
  // Escape hatch (render/asChild) goes through a separate component so the
  // useRender hook is never called conditionally (rules-of-hooks).
  if (props.asChild || props.render) {
    return <ButtonRender {...props} />;
  }

  const {
    className,
    variant = "default",
    size = "default",
    children,
    loading = false,
    disabled,
    expand,
    type,
    asChild: _asChild,
    render: _render,
    ...rest
  } = props;

  return (
    <button
      type={type ?? "button"}
      data-slot="button"
      data-variant={variant}
      disabled={Boolean(loading || disabled)}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ size, variant }), expand && "w-full", className)}
      {...rest}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** render / asChild path — same classes on whatever element is rendered. */
function ButtonRender({
  className,
  variant = "default",
  size = "default",
  render,
  children,
  loading = false,
  disabled,
  asChild,
  expand,
  ...props
}: ButtonProps): React.ReactElement {
  const resolved = resolveRender(asChild, children, render);
  const defaultProps = {
    className: cn(buttonVariants({ size, variant }), expand && "w-full", className),
    "data-slot": "button",
    "data-variant": variant,
    disabled: Boolean(loading || disabled),
    children: resolved.children,
  };
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render: resolved.render,
  });
}
