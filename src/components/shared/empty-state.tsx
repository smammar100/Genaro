import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty / no-access state with the Polaris EmptyState look, drawn with the
 * kit's `p-empty` classes: a tinted icon tile, a 14px semibold heading, a
 * 12px body and the action underneath. Kept as its own component (rather than
 * the kit's EmptyState) because callers pass a lucide icon and a ready-made
 * action node.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div className={cn("p-empty", className)}>
      {Icon ? (
        <div className="p-empty__icon">
          <span className="p-icon">
            <Icon aria-hidden strokeWidth={1.5} />
          </span>
        </div>
      ) : null}
      <div className="p-empty__content">
        <div className="p-empty__text">
          <h3 className="p-empty__heading">{title}</h3>
          {description ? (
            <p className="p-empty__body m-0 text-(--text-secondary)">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}
