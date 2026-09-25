"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Loader2 } from "lucide-react";
import { cn, hitTarget } from "@/lib/utils";
import { resolveRender } from "@/lib/as-child";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

/**
 * Button — Shopify admin style (Polaris), a native <button>.
 *
 * Pills: fully rounded, 32px tall, 13px medium text. Primary is near-black,
 * secondary/outline white with a hairline, ghost has no chrome. Colours come
 * from the theme tokens (--primary, --border, --accent…), which polaris-theme
 * points at Shopify's values. Same API as before, so every call site —
 * including `render` / `asChild` (e.g. <Button render={<Link/>}>) — keeps
 * working unchanged.
 */
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full border font-medium no-underline outline-none",
    "transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    defaultVariants: { size: "default", variant: "default" },
    variants: {
      size: {
        default: "h-8 px-3 text-[13px] leading-5",
        icon: "size-8",
        "icon-lg": "size-9",
        "icon-sm": `size-7 ${hitTarget}`,
        "icon-xl": "size-10",
        "icon-xs": `size-6 ${hitTarget}`,
        lg: "h-9 px-4 text-[13px] leading-5",
        sm: `h-7 gap-1 px-2.5 text-xs ${hitTarget}`,
        xl: "h-10 px-5 text-sm",
        xs: `h-6 gap-1 px-2 text-xs ${hitTarget}`,
      },
      variant: {
        default:
          "border-primary bg-primary font-semibold text-primary-foreground hover:bg-primary/85",
        destructive:
          "border-destructive bg-destructive text-white hover:bg-destructive/90",
        "destructive-outline":
          "border-border bg-card text-destructive-foreground hover:bg-destructive/5",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-accent",
        link: "h-auto border-transparent bg-transparent px-0 text-foreground underline-offset-4 hover:underline",
        outline: "border-border bg-card text-foreground hover:bg-accent",
        secondary: "border-border bg-card text-foreground hover:bg-accent",
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
