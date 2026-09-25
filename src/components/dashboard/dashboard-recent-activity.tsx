"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  Car,
  ClipboardCheck,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { activityService } from "@/lib/services/activity-service";
import type { ActivityActionType, ActivityLogEntry } from "@/lib/types";
import { Button, Card, SkeletonBodyText } from "@/components/polaris";
import { cn } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";

/**
 * Icon, category label and tint for one activity row.
 *
 * The tint used to vary by category — green for warranty, amber for workshop,
 * blue for sales. Genaro's rule 4 reserves red, amber and green for status, and
 * a category is not a status: a workshop entry is not a warning. The category
 * is carried by the icon and the tag text, which say it unambiguously, so the
 * tint is now one neutral brand tone throughout.
 */
function categorize(type: ActivityActionType): {
  Icon: LucideIcon;
  tag: string;
  tint: string;
} {
  if (
    type.startsWith("sale") ||
    type.startsWith("lead") ||
    type.startsWith("appointment")
  )
    return { Icon: TrendingUp, tag: "Sales", tint: "text-(--icon)" };
  if (type.startsWith("inspection"))
    return {
      Icon: ClipboardCheck,
      tag: "Inspection",
      tint: "text-(--icon)",
    };
  if (type.startsWith("maintenance") || type.startsWith("workshop"))
    return {
      Icon: Wrench,
      tag: "Workshop",
      tint: "text-(--icon)",
    };
  if (type.startsWith("photo") || type.startsWith("listing"))
    return { Icon: Camera, tag: "Advert", tint: "text-(--icon)" };
  if (type.startsWith("warranty"))
    return {
      Icon: ShieldCheck,
      tag: "Warranty",
      tint: "text-(--icon)",
    };
  if (type.includes("invoice") || type === "cost_updated")
    return {
      Icon: Receipt,
      tag: "Finance",
      tint: "text-(--icon)",
    };
  if (
    type.startsWith("user") ||
    type.includes("setting") ||
    type.includes("channel") ||
    type === "data_migrated"
  )
    return { Icon: Users, tag: "Admin", tint: "text-(--icon-secondary)" };
  return { Icon: Car, tag: "Inventory", tint: "text-(--icon-secondary)" };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DashboardRecentActivity() {
  const { company } = useAuth();
  const pathname = usePathname();
  const [entries, setEntries] = useState<ActivityLogEntry[] | null>(null);

  useEffect(() => {
    if (!company) return;
    void activityService
      .getAll(company.id)
      .then((e) => setEntries(e.slice(0, 5)));
  }, [company]);

  return (
    <Card
      className="h-full"
      title="Latest news"
      actions={
        <Button variant="plain" url="/admin/activity">
          View all
        </Button>
      }
    >
      {entries === null ? (
        <SkeletonBodyText lines={5} />
      ) : entries.length === 0 ? (
        <p className="body-md px-2 py-6 text-center text-(--text-secondary)">
          Nothing has happened today. Every sale, inspection, workshop job and
          listing change lands here as it is recorded.
        </p>
      ) : (
        <ul className="-mx-2 flex flex-1 list-none flex-col justify-between">
          {entries.map((e) => {
            const { Icon, tag, tint } = categorize(e.actionType);
            const href = e.vehicleId
              ? vehicleDetailHref(e.vehicleId, pathname)
              : "/admin/activity";
            return (
              <li key={e.id}>
                <Link
                  className="flex gap-2.5 rounded-(--radius-200) px-2 py-1.5 no-underline hover:bg-(--bg-surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
                  href={href}
                >
                  {/* The design puts a 54x40 photo here. Activity entries carry
                      no image, so the category icon fills the same slot at the
                      same size rather than leaving a hole or inventing art. */}
                  <span className="grid h-10 w-14 shrink-0 place-items-center rounded-(--radius-200) bg-(--bg-surface-secondary)">
                    <Icon className={cn("h-4 w-4", tint)} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="body-sm text-(--text-secondary)">
                        {tag}
                      </span>
                      <span
                        aria-hidden
                        className="block size-0.5 rounded-full bg-(--icon-secondary)"
                      />
                      <span className="body-sm text-(--text-secondary)">
                        {timeAgo(e.createdAt)}
                      </span>
                    </span>
                    <span className="body-md line-clamp-2 text-pretty text-(--text)">
                      {e.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
