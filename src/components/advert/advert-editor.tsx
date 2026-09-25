"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, X } from "lucide-react";
import { toast } from "@/lib/toast";
import type {
  AdvertData,
  Listing,
  ListingChannel,
  ListingStatus,
  Vehicle,
} from "@/lib/types";
import { listingService } from "@/lib/services/listing-service";
import { useAuth } from "@/contexts/auth-context";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  ProgressBar,
  TextField,
  type BadgeTone,
} from "@/components/polaris";
import { Switch } from "@/components/ui/switch";
import { Panel } from "@/components/vehicle-detail/primitives";
import { RegPlate } from "@/components/shared/reg-plate";
import {
  advertCompleteness,
  computeAdvertChecks,
  type AdvertCheck,
} from "@/lib/advert-completeness";
import { FeaturePicker } from "./feature-picker";
import { AdvertPreview } from "./advert-preview";
import { ADVERT_LIMITS } from "@/lib/advert-limits";

// GEN-103: shared with the Listing tab's inline editor, so the two editors
// cannot end up enforcing different limits on the same copy.
const LIMITS = ADVERT_LIMITS;

const DEFAULT_STRAPLINE =
  "Car Capital UK: quality used cars, competitive finance packages, nationwide delivery and part-exchange welcome. Buy with confidence from a trusted, established dealer.";

const CHANNELS: { key: ListingChannel; label: string; meta: string }[] = [
  { key: "website", label: "Car Capital UK", meta: "thecarcapital.co.uk" },
  { key: "autotrader", label: "AutoTrader", meta: "Profile / full advert" },
  { key: "ebay", label: "eBay Motors", meta: "Classified listing" },
  { key: "facebook", label: "Facebook", meta: "Marketplace" },
];

// Same listing-status tones as the Work list.
const STATUS_TONE: Record<ListingStatus, BadgeTone | undefined> = {
  draft: "info",
  live: "success",
  reserved: "attention",
  sold: undefined,
  archived: undefined,
};
const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  live: "Live",
  reserved: "Reserved",
  sold: "Sold",
  archived: "Archived",
};

function splitHighlights(s: string): string[] {
  return s
    .split(/[•\n;,]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5);
}

interface AdvertEditorProps {
  vehicle: Vehicle;
  listing: Listing | null;
  photoCount: number;
  photoUrl: string | null;
}

export function AdvertEditor({
  vehicle,
  listing,
  photoCount,
  photoUrl,
}: AdvertEditorProps) {
  const { user, company } = useAuth();
  const router = useRouter();

  const [advert, setAdvert] = useState<AdvertData>(() => {
    const saved = (listing?.advertData ?? {}) as Partial<AdvertData>;
    return {
      attentionGrabber: saved.attentionGrabber ?? "",
      keySellingPoint: saved.keySellingPoint ?? "",
      strapline: saved.strapline ?? "",
      subtitle: saved.subtitle ?? "",
      highlights: saved.highlights?.length
        ? saved.highlights
        : splitHighlights(listing?.specialFeatures ?? ""),
      features: saved.features ?? [],
      taxonomy: saved.taxonomy ?? {},
    };
  });
  const [description, setDescription] = useState(listing?.description ?? "");
  const [price, setPrice] = useState<number>(
    listing?.price ?? vehicle.listingPrice ?? 0,
  );
  const [channels, setChannels] = useState<Record<ListingChannel, boolean>>(
    listing?.channels ?? {
      website: false,
      autotrader: false,
      ebay: false,
      facebook: false,
    },
  );
  const [savedListing, setSavedListing] = useState<Listing | null>(listing);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const checks = computeAdvertChecks(
    vehicle,
    { description, price, channels },
    photoCount,
  );
  const { done, total, pct } = advertCompleteness(checks);

  const status = savedListing?.status ?? "draft";

  function setTax(key: keyof AdvertData["taxonomy"], val: string) {
    setAdvert((a) => ({ ...a, taxonomy: { ...a.taxonomy, [key]: val } }));
  }
  function setHighlight(i: number, val: string) {
    setAdvert((a) => {
      const h = [...a.highlights];
      while (h.length < 5) h.push("");
      h[i] = val;
      return { ...a, highlights: h };
    });
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/listing/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: advert.taxonomy.make ?? vehicle.make,
          model: advert.taxonomy.model ?? vehicle.model,
          derivative: advert.taxonomy.derivative ?? vehicle.derivative,
          year: vehicle.year,
          mileage: vehicle.mileage,
          colour: vehicle.colour,
          fuelType: vehicle.fuelType,
          transmission: vehicle.transmission,
          bodyType: vehicle.bodyType,
          price,
          features: advert.features,
        }),
      });
      const data = (await res.json()) as { description?: string; source?: string };
      if (data.description) {
        setDescription(data.description);
        toast.success(
          data.source === "openai"
            ? "Description generated"
            : "Description drafted (template)",
        );
      } else {
        toast.error("No description returned");
      }
    } catch {
      toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!company || !user) return;
    // Block save when any field is over its shown limit — don't silently
    // persist copy the channels (AutoTrader/website) will reject or truncate.
    const overLimit: string[] = [];
    if (advert.attentionGrabber.length > LIMITS.attentionGrabber)
      overLimit.push("Attention grabber");
    if (advert.keySellingPoint.length > LIMITS.keySellingPoint)
      overLimit.push("Key selling point");
    if (advert.subtitle.length > LIMITS.subtitle) overLimit.push("Subtitle");
    if (advert.strapline.length > LIMITS.strapline) overLimit.push("Strapline");
    if (description.length > LIMITS.description) overLimit.push("Description");
    if (advert.highlights.some((h) => h.length > LIMITS.highlight))
      overLimit.push("Highlights");
    if (overLimit.length > 0) {
      toast.error(
        `Over the character limit: ${overLimit.join(", ")}. Trim before saving.`,
      );
      return;
    }
    setSaving(true);
    try {
      const base =
        savedListing ??
        (await listingService.ensureForVehicle(vehicle, company.id, user.id));
      const highlightsLine = advert.highlights
        .map((h) => h.trim())
        .filter(Boolean)
        .join(" • ");
      // Preserve a custom title if the listing already has one — only fall back
      // to the vehicle-derived default when no title has been set, so editing
      // the advert never discards a hand-written title.
      const defaultTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim();
      const title = base.title?.trim() ? base.title : defaultTitle;
      const updated = await listingService.update(base.id, {
        title,
        description,
        price,
        specialFeatures: highlightsLine,
        channels,
        advertData: advert,
      });
      setSavedListing(updated);
      toast.success("Advert saved");
      router.push(`/vehicles/${vehicle.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save advert");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky action header */}
      <Card className="sticky top-0 z-20 flex-row flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="tertiary"
            icon="ArrowLeftMinor"
            accessibilityLabel="Back to vehicle"
            url={`/vehicles/${vehicle.id}`}
            className="shrink-0"
          />
          <RegPlate registration={vehicle.registration} size="sm" />
          <div className="min-w-0">
            <div className="heading-sm truncate">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </div>
            <div className="body-sm truncate text-(--text-secondary)">
              {[
                price ? formatCurrency(price) : null,
                `${vehicle.mileage.toLocaleString("en-GB")} mi`,
                vehicle.colour,
                vehicle.transmission,
                vehicle.fuelType,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
          <Button
            variant="primary"
            onClick={() => void save()}
            loading={saving}
          >
            Save advert
          </Button>
        </div>
      </Card>

      {/* Body: form + sticky rail */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* ── Form column ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Spotlight */}
          <section id="spotlight" className="scroll-mt-24">
            <Panel
              title="AutoTrader spotlight"
              subtitle="The bold text buyers see first on the search results card"
            >
              <div className="flex flex-col gap-4">
                <CharField
                  label="Attention grabber"
                  help="Short hook, e.g. “Just arrived” or “1 owner”."
                  value={advert.attentionGrabber}
                  onChange={(v) =>
                    setAdvert((a) => ({ ...a, attentionGrabber: v }))
                  }
                  max={LIMITS.attentionGrabber}
                  placeholder="Attention grabber…"
                />
                <CharField
                  label="Key selling point"
                  help="The single best reason to buy this car."
                  value={advert.keySellingPoint}
                  onChange={(v) =>
                    setAdvert((a) => ({ ...a, keySellingPoint: v }))
                  }
                  max={LIMITS.keySellingPoint}
                  placeholder="Key selling point…"
                />
              </div>
            </Panel>
          </section>

          {/* Taxonomy */}
          <section id="taxonomy" className="scroll-mt-24">
            <Panel
              title="Taxonomy"
              subtitle="Mapped to AutoTrader's hierarchy · synced from your vehicle lookup"
            >
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <TextField
                  label="Make"
                  value={advert.taxonomy.make ?? vehicle.make}
                  onChange={(v) => setTax("make", v)}
                />
                <TextField
                  label="Model"
                  value={advert.taxonomy.model ?? vehicle.model}
                  onChange={(v) => setTax("model", v)}
                />
                <TextField
                  label="Generation"
                  value={advert.taxonomy.generation ?? vehicle.generation ?? ""}
                  onChange={(v) => setTax("generation", v)}
                />
                <TextField
                  label="Trim"
                  value={advert.taxonomy.trim ?? vehicle.trim ?? ""}
                  onChange={(v) => setTax("trim", v)}
                />
                <TextField
                  label="Fuel type"
                  value={advert.taxonomy.fuelType ?? vehicle.fuelType}
                  onChange={(v) => setTax("fuelType", v)}
                />
                <TextField
                  label="Engine size"
                  value={
                    advert.taxonomy.engineSize ??
                    (vehicle.engineSizeCC
                      ? `${(vehicle.engineSizeCC / 1000).toFixed(1)}L`
                      : "")
                  }
                  onChange={(v) => setTax("engineSize", v)}
                />
                <TextField
                  label="Transmission"
                  value={advert.taxonomy.transmission ?? vehicle.transmission}
                  onChange={(v) => setTax("transmission", v)}
                />
                <TextField
                  label="Derivative"
                  value={
                    advert.taxonomy.derivative ?? vehicle.derivative ?? ""
                  }
                  onChange={(v) => setTax("derivative", v)}
                />
              </div>
            </Panel>
          </section>

          {/* Description */}
          <section id="description" className="scroll-mt-24">
            <Panel
              title="Vehicle description"
              subtitle={`${description.length.toLocaleString()} / ${LIMITS.description.toLocaleString()} chars · the main advert copy`}
              action={
                <Button
                  icon="WandMinor"
                  onClick={() => void generate()}
                  loading={generating}
                >
                  Generate
                </Button>
              }
            >
              <TextField
                label="Vehicle description"
                labelHidden
                multiline={8}
                value={description}
                onChange={setDescription}
                placeholder="Describe the key facts about the vehicle, or select Generate to draft it with AI."
                error={description.length > LIMITS.description}
              />
              <div className="mt-2 flex items-center justify-between">
                <Button variant="plain" onClick={() => setDescription("")}>
                  Clear text
                </Button>
                <span
                  className={cn(
                    "body-sm tabular-nums",
                    description.length > LIMITS.description
                      ? "text-(--text-critical)"
                      : "text-(--text-secondary)",
                  )}
                >
                  {description.length.toLocaleString()} /{" "}
                  {LIMITS.description.toLocaleString()}
                </span>
              </div>
            </Panel>
          </section>

          {/* Strapline */}
          <section id="strapline" className="scroll-mt-24">
            <Panel
              title="Dealer strapline"
              subtitle="Shown beneath the description on every advert"
              action={
                <Button
                  onClick={() =>
                    setAdvert((a) => ({ ...a, strapline: DEFAULT_STRAPLINE }))
                  }
                >
                  Use default
                </Button>
              }
            >
              <TextField
                label="Dealer strapline"
                labelHidden
                multiline={4}
                value={advert.strapline}
                onChange={(v) => setAdvert((a) => ({ ...a, strapline: v }))}
                placeholder="Enter dealer strapline here…"
                error={advert.strapline.length > LIMITS.strapline}
              />
              <div
                className={cn(
                  "body-sm mt-2 text-right tabular-nums",
                  advert.strapline.length > LIMITS.strapline
                    ? "text-(--text-critical)"
                    : "text-(--text-secondary)",
                )}
              >
                {advert.strapline.length} / {LIMITS.strapline}
              </div>
            </Panel>
          </section>

          {/* Website */}
          <section id="website" className="scroll-mt-24">
            <Panel
              title="Website highlights"
              subtitle="Subtitle + up to 5 bullet points shown on the listing card"
            >
              <div className="flex flex-col gap-4">
                <CharField
                  label="Vehicle subtitle"
                  value={advert.subtitle}
                  onChange={(v) => setAdvert((a) => ({ ...a, subtitle: v }))}
                  max={LIMITS.subtitle}
                  placeholder="Subtitle text…"
                />
                <div className="grid gap-2">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const val = advert.highlights[i] ?? "";
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="body-sm w-5 tabular-nums text-(--text-secondary)">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <TextField
                            label={`Highlight ${i + 1}`}
                            labelHidden
                            value={val}
                            onChange={(v) => setHighlight(i, v)}
                            maxLength={LIMITS.highlight}
                            placeholder={`Highlight ${i + 1}…`}
                          />
                        </div>
                        <span className="body-sm w-12 text-right tabular-nums text-(--text-secondary)">
                          {val.length}/{LIMITS.highlight}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </section>

          {/* Equipment */}
          <section id="equipment" className="scroll-mt-24">
            <Panel
              title="Equipment"
              subtitle={`${advert.features.length} feature${advert.features.length === 1 ? "" : "s"} selected`}
            >
              <FeaturePicker
                selected={advert.features}
                onChange={(features) => setAdvert((a) => ({ ...a, features }))}
              />
            </Panel>
          </section>

          {/* Channels & pricing */}
          <section id="channels" className="scroll-mt-24">
            <Panel
              title="Channels and pricing"
              subtitle="Where this advert appears and at what price"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Advertised price"
                  type="number"
                  prefix="£"
                  value={price ? String(price) : ""}
                  onChange={(v) => setPrice(Number(v) || 0)}
                  placeholder="0"
                />
                <TextField
                  label="Floor (minimum)"
                  readOnly
                  value={
                    vehicle.minimumSalePrice
                      ? formatCurrency(vehicle.minimumSalePrice)
                      : "Not set"
                  }
                />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {CHANNELS.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-(--radius-200) border border-(--border) px-3 py-2 hover:bg-(--bg-surface-hover)"
                  >
                    <div className="min-w-0">
                      <div className="body-md">{c.label}</div>
                      <div className="body-sm truncate text-(--text-secondary)">
                        {c.meta}
                      </div>
                    </div>
                    <Switch
                      checked={channels[c.key]}
                      onCheckedChange={(v) =>
                        setChannels((ch) => ({ ...ch, [c.key]: v }))
                      }
                    />
                  </label>
                ))}
              </div>
            </Panel>
          </section>

          {/* Footer save bar */}
          <Card className="flex-row items-center justify-between gap-3 px-4 py-3">
            <span className="body-sm text-(--text-secondary)">
              {done} of {total} advert fields ready · saved as{" "}
              <span className="text-(--text)">{STATUS_LABEL[status].toLowerCase()}</span>
            </span>
            <Button onClick={() => void save()} loading={saving}>
              Save advert
            </Button>
          </Card>
        </div>

        {/* ── Sticky rail ───────────────────────────────────────── */}
        <div
          id="preview"
          className="flex scroll-mt-24 flex-col gap-4 lg:sticky lg:top-24 lg:self-start"
        >
          <Panel title="Live preview" subtitle="How buyers see this advert">
            <AdvertPreview
              vehicle={vehicle}
              advert={advert}
              description={description}
              price={price}
              photoUrl={photoUrl}
            />
          </Panel>

          <Panel
            title="Advert completeness"
            subtitle={`${done} of ${total} ready`}
          >
            <ProgressBar
              progress={pct}
              size="small"
              tone="primary"
              accessibilityLabel="Advert completeness"
            />
            <div className="mt-3 flex flex-col gap-2">
              {checks.map((c) => (
                <CheckRow key={c.key} check={c} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────

function CharField({
  label,
  help,
  value,
  onChange,
  max,
  placeholder,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
}) {
  const over = value.length > max;
  return (
    <div>
      <TextField
        label={label}
        helpText={help}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        error={over}
      />
      <div
        className={cn(
          "body-sm mt-1 text-right tabular-nums",
          over ? "text-(--text-critical)" : "text-(--text-secondary)",
        )}
      >
        {value.length} / {max}
      </div>
    </div>
  );
}

const CHECK_TONE: Record<AdvertCheck["state"], string> = {
  done: "bg-(--bg-fill-success-secondary) text-(--icon-success)",
  warn: "bg-(--bg-fill-warning-secondary) text-(--icon-warning)",
  miss: "bg-(--bg-fill-secondary) text-(--icon-secondary)",
};

function CheckRow({ check }: { check: AdvertCheck }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          CHECK_TONE[check.state],
        )}
      >
        {check.state === "done" ? (
          <Check className="size-3" strokeWidth={3} />
        ) : check.state === "warn" ? (
          <AlertCircle className="size-3" />
        ) : (
          <X className="size-3" strokeWidth={3} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="body-md">{check.name}</div>
        <div className="body-sm truncate text-(--text-secondary)">
          {check.meta}
        </div>
      </div>
    </div>
  );
}
