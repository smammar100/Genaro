"use client";

import { cn } from "@/lib/utils";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterChipsProps<T extends string> {
  options: FilterOption<T>[];
  activeValue: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Small toggle row used above warranty/claim tables. Built on the existing
 * shadcn Button primitive so the active/idle styling matches the rest of
 * the app's filter UI.
 */
export function FilterChips<T extends string>({
  options,
  activeValue,
  onChange,
  className,
}: FilterChipsProps<T>) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {options.map((opt) => {
        const active = opt.value === activeValue;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-colors",
              active
                ? "bg-[#ebebeb] font-medium text-foreground"
                : "text-[#4a4a4a] hover:bg-[#f1f1f1]",
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" && (
              <span className="text-xs text-muted-foreground">{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
