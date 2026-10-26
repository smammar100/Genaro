import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/genaro";
import { cn } from "@/lib/utils";

interface BandedCardProps {
  icon: LucideIcon;
  title: ReactNode;
  children: ReactNode;
  /** The card's actions as plain links, top right of the header. */
  actions?: ReactNode;
  className?: string;
}

/**
 * A banded card, as used by the vehicle Overview's row of cards (Pricing,
 * Location, Sales highlights; picked 26 Oct 2026). The header band has an
 * icon tile, the title and the card's actions as plain links on the right;
 * the body below holds the detail. The card fills its grid cell, so a row of
 * them is level.
 * @import import { BandedCard } from "@/components/vehicle-detail/banded-card";
 */
export function BandedCard({ icon: Icon, title, children, actions, className }: BandedCardProps) {
  return (
    <Card padding="0" className={cn("h-full", className)}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-(--border-secondary) px-4 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-(--radius-200) bg-(--bg-fill-secondary)">
            <Icon aria-hidden className="size-4 text-(--icon-secondary)" />
          </span>
          <h2 className="min-w-0 flex-1 heading-sm text-(--text)">{title}</h2>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
        <div className="flex flex-1 flex-col gap-2.5 px-4 py-3">{children}</div>
      </div>
    </Card>
  );
}
