import { Badge } from "@/components/genaro";

interface ProviderBadgeProps {
  provider: string | null;
  className?: string;
}

/** Neutral badge naming the warranty provider — providers aren't statuses. */
export function ProviderBadge({ provider, className }: ProviderBadgeProps) {
  if (!provider) {
    return <span className="text-(--text-secondary)">—</span>;
  }
  return <Badge className={className}>{provider}</Badge>;
}
