import type React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  /** 14px/600 heading shown outside (above) the card. */
  title?: React.ReactNode;
  /** One-line 13px #616161 description under the heading. */
  description?: React.ReactNode;
  /** Right-aligned actions on the heading row. */
  actions?: React.ReactNode;
  /** Wrap children in a Card (default true). Set false to lay out your own cards. */
  card?: boolean;
  cardClassName?: string;
};

/**
 * Shopify settings-style section: heading + description outside the card,
 * then the card 8px below. Stack sections with `gap-8` (32px).
 */
export function Section({
  title,
  description,
  actions,
  card = true,
  cardClassName,
  className,
  children,
  ...props
}: SectionProps): React.ReactElement {
  return (
    <section
      className={cn("flex flex-col gap-2", className)}
      data-slot="section"
      {...props}
    >
      {title || description || actions ? (
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title ? (
              <h2 className="font-semibold text-foreground text-sm leading-5">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-[#616161] text-[13px] leading-5">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {card ? (
        <Card className={cn("gap-3 px-4 py-3", cardClassName)}>{children}</Card>
      ) : (
        children
      )}
    </section>
  );
}

/** Vertical stack of Sections with Shopify's 32px rhythm. */
export function SectionStack({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn("flex flex-col gap-8", className)}
      data-slot="section-stack"
      {...props}
    />
  );
}
