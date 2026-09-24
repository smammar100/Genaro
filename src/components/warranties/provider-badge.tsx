"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


interface ProviderBadgeProps {
  provider: string | null;
  className?: string;
}

export function ProviderBadge({ provider, className }: ProviderBadgeProps) {
  if (!provider) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        —
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      // Shopify-style neutral gray tag — providers aren't statuses.
      className={cn("bg-[#ebebeb] font-medium text-[#303030]", className)}
    >
      {provider}
    </Badge>
  );
}
