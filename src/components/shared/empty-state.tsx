import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl bg-card px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="grid h-10 w-10 place-items-center text-[#8a8a8a]">
          <Icon className="h-8 w-8" strokeWidth={1.5} />
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="max-w-sm text-[13px] leading-5 text-[#616161]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
