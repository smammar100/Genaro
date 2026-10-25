"use client";

import { useState } from "react";
import Image from "next/image";
import { Car, RefreshCw } from "lucide-react";
import type { Vehicle } from "@/lib/types";
import type { CarAngle } from "@/lib/services/photo-service";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { RegPlate } from "./reg-plate";

type Variant = "thumb" | "card" | "hero";

// What the browser picks a srcset width from. Thumbs render 40-72px wide;
// cards up to ~360px (full width on phones); pass `sizes` when a card sits in
// a slot that is known to be smaller.
const VARIANT_SIZES: Record<Variant, string> = {
  thumb: "64px",
  card: "(max-width: 768px) 100vw, 360px",
  hero: "(max-width: 1024px) 100vw, 720px",
};

/**
 * Whether next/image may resize `url` through /_next/image.
 *
 * Mirrors `images.remotePatterns` in next.config.ts: Supabase public storage
 * and Unsplash (demo cars). Anything else remote would be a 400 from the
 * optimizer, so it is served as-is; data:/blob: previews cannot be fetched by
 * the server at all. Same-origin paths (/generated/...) are always optimised.
 */
export function canOptimizeImage(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.hostname === "images.unsplash.com") return true;
  return (
    u.hostname.endsWith(".supabase.co") &&
    u.pathname.startsWith("/storage/v1/object/public/")
  );
}

interface Props {
  vehicle: Pick<Vehicle, "id" | "registration" | "heroImageUrl">;
  angle?: CarAngle;
  variant?: Variant;
  className?: string;
  alt?: string;
  /** Overrides the variant's `sizes` when the slot is known to be smaller. */
  sizes?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  thumb: "aspect-[4/3] w-16 rounded-md",
  card: "aspect-[16/10] w-full rounded-md",
  hero: "aspect-[16/9] w-full rounded-lg",
};

// Module-level dedupe across mounts in the same tab.
const inFlight = new Map<string, Promise<string>>();
const failed = new Set<string>();

function urlFor(vehicleId: string, angle: CarAngle): string {
  return `/generated/cars/${vehicleId}/${angle}.png`;
}

async function fetchOrGenerate(
  vehicleId: string,
  angle: CarAngle,
): Promise<string> {
  const key = `${vehicleId}:${angle}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = (async () => {
    const res = await fetch("/api/photo/vehicle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, angle }),
    });
    const json = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !json.url) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    return json.url;
  })();
  inFlight.set(key, p);
  try {
    return await p;
  } finally {
    inFlight.delete(key);
  }
}

export function VehicleImage({
  vehicle,
  angle = "hero",
  variant = "card",
  className,
  alt,
  sizes,
}: Props) {
  // "No image" mode: vehicle has no pre-rendered hero image. Render the
  // placeholder directly without hitting the image-gen API — used by mock/demo
  // vehicles imported from the CSV stock list.
  const placeholderOnly = angle === "hero" && !vehicle.heroImageUrl;

  const initialUrl =
    angle === "hero" && vehicle.heroImageUrl
      ? vehicle.heroImageUrl
      : urlFor(vehicle.id, angle);
  const [url, setUrl] = useState<string>(initialUrl);
  const [pending, setPending] = useState(false);
  const [errored, setErrored] = useState(placeholderOnly);

  // Start over when the vehicle changes (adjust-state-on-prop-change, in render).
  const resetKey = `${vehicle.id}:${angle}:${placeholderOnly}`;
  const [shownKey, setShownKey] = useState(resetKey);
  if (resetKey !== shownKey) {
    setShownKey(resetKey);
    setUrl(initialUrl);
    setPending(false);
    setErrored(placeholderOnly);
  }

  function handleImgError() {
    // 404 on the static file → trigger generation (unless we've already failed)
    const key = `${vehicle.id}:${angle}`;
    if (failed.has(key)) {
      setErrored(true);
      return;
    }
    setPending(true);
    fetchOrGenerate(vehicle.id, angle)
      .then(setUrl)
      .catch(() => {
        failed.add(key);
        setErrored(true);
      })
      .finally(() => setPending(false));
  }

  const sizeClass = VARIANT_CLASSES[variant];

  if (errored) {
    // Stylized placeholder: diagonal-stripe background + larger car silhouette.
    // Used for demo vehicles without a pre-rendered hero image, and for any
    // image that genuinely 404'd from the generation service.
    const iconSize =
      variant === "thumb" ? "h-6 w-6" : variant === "card" ? "h-12 w-12" : "h-20 w-20";
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden",
          "bg-gradient-to-br from-muted to-muted/60 text-muted-foreground",
          // Subtle diagonal stripe pattern via CSS gradient
          "[background-image:repeating-linear-gradient(45deg,transparent,transparent_8px,var(--bg-fill-transparent)_8px,var(--bg-fill-transparent)_16px)]",
          // Neutral inset edge (shadow-border-inset: 8% black, 8% white in
          // dark) so it reads as depth against any surface colour behind it.
          "shadow-(--shadow-border-inset)",
          sizeClass,
          className,
        )}
        title={placeholderOnly ? "No image" : "Image unavailable"}
      >
        <Car className={cn(iconSize, "opacity-50")} strokeWidth={1.4} />
        {variant !== "thumb" && (
          <RegPlate
            registration={vehicle.registration}
            size={variant === "hero" ? "md" : "sm"}
            className="absolute bottom-1.5 right-1.5"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        "shadow-(--shadow-border-inset)",
        sizeClass,
        className,
      )}
    >
      {pending && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      )}
      <Image
        src={url}
        alt={alt ?? `Vehicle ${vehicle.registration}`}
        fill
        sizes={sizes ?? VARIANT_SIZES[variant]}
        className={cn(
          "object-cover transition-opacity",
          pending && "opacity-0",
        )}
        onError={handleImgError}
        // Supabase/Unsplash originals are full-size photos; letting the
        // optimizer resize them is what keeps a 40px thumb from downloading
        // a multi-megabyte file.
        unoptimized={!canOptimizeImage(url)}
      />
      {pending && variant !== "thumb" && (
        <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-caption text-muted-foreground backdrop-blur">
          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
          Generating
        </span>
      )}
    </div>
  );
}
