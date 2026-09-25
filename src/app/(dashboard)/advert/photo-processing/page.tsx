"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import type { Vehicle } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Page,
  TextField,
} from "@/components/polaris";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RegPlate } from "@/components/shared/reg-plate";
import { vehicleMatches } from "@/components/shared/vehicle-picker";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

// Swatches preview the physical backdrop the car is composed onto, so they are
// content colours (like the registration-plate yellow), not UI chrome: they
// must look the same in light and dark mode, hence the fixed palette values.
const BACKGROUNDS = [
  { id: "white", label: "White studio", swatch: "bg-zinc-50", hint: "seamless white cyclorama" }, // audit-ignore: content swatch
  { id: "grey", label: "Grey studio", swatch: "bg-zinc-300", hint: "soft grey cyclorama" }, // audit-ignore: content swatch
  { id: "showroom", label: "Showroom floor", swatch: "bg-amber-100", hint: "polished marble dealership floor with overhead halogen lighting" }, // audit-ignore: content swatch
  { id: "driveway", label: "Outdoor driveway", swatch: "bg-stone-300", hint: "suburban driveway with brick paving and soft daylight" }, // audit-ignore: content swatch
  { id: "luxury", label: "Luxury gradient", swatch: "bg-gradient-to-br from-violet-200 to-rose-200", hint: "abstract violet-to-rose gradient" }, // audit-ignore: content swatch
  { id: "sunset", label: "Sunset", swatch: "bg-gradient-to-br from-orange-300 to-rose-400", hint: "dramatic sunset over coastal road" }, // audit-ignore: content swatch
  { id: "mountain", label: "Mountain", swatch: "bg-gradient-to-br from-sky-300 to-emerald-300", hint: "scenic mountain pass at golden hour" }, // audit-ignore: content swatch
  { id: "beach", label: "Beach", swatch: "bg-gradient-to-br from-sky-200 to-amber-100", hint: "sandy beach with calm sea horizon" }, // audit-ignore: content swatch
  { id: "garage", label: "Garage", swatch: "bg-zinc-700", hint: "concrete garage with directional spotlights" }, // audit-ignore: content swatch
  { id: "black", label: "Plain black", swatch: "bg-black", hint: "infinite black void with rim lighting" }, // audit-ignore: content swatch
];

export default function PhotoProcessingPage() {
  const pathname = usePathname();
  const { user, company } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [query, setQuery] = useState("");
  const [bg, setBg] = useState("white");
  const bgProcessingId = useId();

  useEffect(() => {
    if (!company) return;
    void vehicleService.getAll(company.id).then((v) => {
      setVehicles(v);
      const withImages = v.filter((x) => x.imagesCount > 0);
      if (withImages.length > 0 && !selected) setSelected(withImages[0].id);
      else if (v.length > 0 && !selected) setSelected(v[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const vehicle = vehicles?.find((v) => v.id === selected) ?? null;
  // Stock runs past a hundred cars, so scrolling the sidebar to find a plate
  // you already know is a hunt (GEN-79). Same matcher as the reg pickers, so
  // "NA66 XGM", "na66xgm" and the stock ID all find the same car.
  const shownVehicles = (vehicles ?? []).filter((v) => vehicleMatches(v, query));
  const swatch = BACKGROUNDS.find((b) => b.id === bg)!;

  // Processed (BG-removed white-studio) and composed (car on selected backdrop)
  // tiles: ephemeral URLs returned by /api/photo/vehicle and cached on disk.
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedLoading, setProcessedLoading] = useState(false);
  const [composedUrl, setComposedUrl] = useState<string | null>(null);
  const [composedLoading, setComposedLoading] = useState(false);

  // Reset tiles when the selected vehicle changes
  useEffect(() => {
    setProcessedUrl(null);
    setComposedUrl(null);
  }, [selected]);

  async function fetchAngle(
    vehicleId: string,
    angle: "processed" | "composed",
    extra?: { backdropKey: string; backdropHint: string },
  ): Promise<string> {
    const res = await fetch("/api/photo/vehicle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, angle, ...extra }),
    });
    const json = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !json.url) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    return json.url;
  }

  async function handleProcess() {
    if (!vehicle) return;
    setProcessedLoading(true);
    try {
      const url = await fetchAngle(vehicle.id, "processed");
      setProcessedUrl(url);
      setBgRemoved(true);
      toast.success("Background removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Process failed");
    } finally {
      setProcessedLoading(false);
    }
  }

  // Auto-generate composed when the backdrop changes (cached per vehicle+key)
  useEffect(() => {
    if (!vehicle) return;
    let cancelled = false;
    setComposedLoading(true);
    setComposedUrl(null);
    fetchAngle(vehicle.id, "composed", {
      backdropKey: swatch.id,
      backdropHint: swatch.hint,
    })
      .then((u) => {
        if (cancelled) return;
        setComposedUrl(u);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(
          e instanceof Error ? e.message : "Compose failed",
        );
      })
      .finally(() => {
        if (!cancelled) setComposedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicle, swatch.id, swatch.hint]);


  return (
    <Page
      title="Photo processing"
      subtitle="Prepare vehicle photos for advertising. Remove backgrounds, apply backdrops, and generate AI images."
      fullWidth
    >
      {!vehicles ? (
        <Skeleton className="h-72 rounded-(--radius-300)" />
      ) : vehicles.length === 0 ? (
        <Card padding="0">
          <EmptyState heading="No vehicles in stock" icon="ProductsMinor">
            Add a vehicle first, then come back here to manage photos.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <Card padding="0" className="max-h-[70vh] gap-1 p-2">
            <div className="shrink-0">
              <TextField
                label="Search vehicles"
                labelHidden
                prefix="SearchMinor"
                value={query}
                onChange={setQuery}
                placeholder="Search reg, stock ID or model…"
                clearButton
                onClearButtonClick={() => setQuery("")}
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {shownVehicles.length === 0 && (
                <p className="body-sm px-2 py-3 text-(--text-secondary)">
                  No vehicle matches that reg.
                </p>
              )}
              {shownVehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={selected === v.id}
                  onClick={() => {
                    setSelected(v.id);
                    setBgRemoved(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-(--radius-200) p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-(--border-focus)",
                    selected === v.id
                      ? "bg-(--bg-surface-selected)"
                      : "hover:bg-(--bg-surface-hover)",
                  )}
                >
                  <RegPlate registration={v.registration} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="body-md-semibold truncate">
                      {v.make} {v.model}
                    </div>
                    <div className="body-sm text-(--text-secondary)">
                      {v.imagesCount} photos
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="gap-4">
            {vehicle && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="heading-sm">
                      {vehicle.make} {vehicle.model}
                    </h2>
                    <p className="body-md text-(--text-secondary)">
                      {vehicle.imagesCount} photos · {vehicle.stockId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* v4.1 TC-P2-008/009: Mark photos ready transitions
                        photos_pending → photos_ready → ready */}
                    <Button
                      variant="primary"
                      onClick={async () => {
                        if (!user) return;
                        // Both photos_pending and photos_ready advance to
                        // "ready" — the button is enabled for exactly these
                        // two states, so the handler and disabled-state agree.
                        if (
                          vehicle.status === "photos_pending" ||
                          vehicle.status === "photos_ready"
                        ) {
                          await vehicleService.changeStatus(
                            vehicle.id,
                            "ready",
                            user.id,
                          );
                          toast.success(`${vehicle.registration} marked ready`);
                          if (company)
                            setVehicles(
                              await vehicleService.getAll(company.id),
                            );
                        }
                      }}
                      disabled={
                        vehicle.status !== "photos_pending" &&
                        vehicle.status !== "photos_ready"
                      }
                    >
                      Mark photos ready
                    </Button>
                    <Button url={vehicleDetailHref(vehicle.id, pathname)}>
                      Open vehicle
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="relative overflow-hidden rounded-(--radius-200) border border-(--border)">
                      <VehicleImage
                        vehicle={vehicle}
                        variant="card"
                        className="h-44 rounded-none"
                      />
                      <TileFooter label="Original" badge="AI hero" />
                    </div>
                    <ImageTile
                      label="Processed"
                      badge={processedUrl ? "Background removed" : "Not processed"}
                      url={processedUrl}
                      loading={processedLoading}
                      fallbackTone="bg-(--bg-surface-secondary)"
                      overlay={
                        !processedUrl && !processedLoading ? (
                          <Button icon="WandMinor" onClick={() => void handleProcess()}>
                            Process background
                          </Button>
                        ) : null
                      }
                    />
                    <ImageTile
                      label="Composed"
                      badge={swatch.label}
                      url={composedUrl}
                      loading={composedLoading}
                      fallbackTone={swatch.swatch}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Label htmlFor={bgProcessingId} className="body-md">
                      Background processing
                    </Label>
                    <Switch
                      id={bgProcessingId}
                      checked={bgRemoved}
                      onCheckedChange={setBgRemoved}
                    />
                    <span className="body-sm text-(--text-secondary)">
                      {bgRemoved ? "On" : "Off"}
                    </span>
                  </div>

                  <div>
                    <p className="body-md-semibold mb-2">
                      Replacement background
                    </p>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                      {BACKGROUNDS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          aria-pressed={bg === b.id}
                          onClick={() => setBg(b.id)}
                          className={cn(
                            "body-sm flex flex-col items-center gap-1 rounded-(--radius-200) p-1 transition focus-visible:outline-2 focus-visible:outline-(--border-focus)",
                            bg === b.id
                              ? "ring-2 ring-(--border-emphasis)"
                              : "ring-1 ring-(--border) hover:ring-(--border-hover)",
                          )}
                          title={b.label}
                        >
                          <span
                            className={cn(
                              "h-12 w-full rounded-(--radius-100)",
                              b.swatch,
                            )}
                          />
                          <span className="line-clamp-1 text-center">
                            {b.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </Page>
  );
}

function TileFooter({ label, badge }: { label: string; badge: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-(--border) bg-(--bg-surface) px-2 py-1.5">
      <span className="body-sm-semibold">{label}</span>
      <Badge>{badge}</Badge>
    </div>
  );
}

function ImageTile({
  label,
  badge,
  url,
  loading,
  fallbackTone,
  overlay,
}: {
  label: string;
  badge: string;
  url: string | null;
  loading: boolean;
  fallbackTone: string;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-(--radius-200) border border-(--border)">
      <div
        className={cn(
          "relative flex h-44 w-full items-center justify-center",
          !url && fallbackTone,
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : !loading ? (
          <ImageIcon className="h-10 w-10 text-(--icon-secondary)" />
        ) : null}
        {loading && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
        {overlay && !loading && (
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px]">
            {overlay}
          </div>
        )}
        {loading && (
          <span className="body-sm absolute bottom-1 right-1 inline-flex items-center gap-1 rounded-(--radius-100) bg-(--bg-surface)/80 px-1.5 py-0.5 text-(--text-secondary) backdrop-blur">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Generating
          </span>
        )}
      </div>
      <TileFooter label={label} badge={badge} />
    </div>
  );
}
