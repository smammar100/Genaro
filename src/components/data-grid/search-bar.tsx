"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Standardised search input for list pages. Replaces the five different
 * inline patterns currently in /vehicles, /admin/master-sheet,
 * /warranties/claims, /advert/work-list, and /admin/users-and-permissions.
 *
 * Controlled — the consumer owns `value` and `onChange` so they can wire
 * to URL params (`?q=…`), debouncing, or whatever filter pipeline the
 * page uses. We provide no state; we provide the input UI.
 */
export function DataGridSearchBar({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 h-4 w-4 -translate-y-1/2 text-(--text-secondary)" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 pr-7 pl-7"
      />
      {value && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute top-1/2 right-0.5 z-10 h-6 w-6 -translate-y-1/2 rounded-md text-(--text-secondary) hover:bg-(--bg-fill-transparent-hover) hover:text-foreground"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
