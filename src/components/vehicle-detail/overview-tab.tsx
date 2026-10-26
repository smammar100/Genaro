"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Globe, Rocket, X } from "lucide-react";
import { toast } from "@/lib/toast";
import type { Listing, Vehicle } from "@/lib/types";
import { listingService } from "@/lib/services/listing-service";
import { dvlaService } from "@/lib/services/dvla-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { Button, EmptyState, ProgressBar } from "@/components/genaro";
import { cn, formatCurrency } from "@/lib/utils";
import { Panel, Pill } from "./primitives";
import { OverviewStats } from "./overview-stats";
import { VehicleLocationSection } from "@/components/locations/vehicle-location-section";
import {
  computeAdvertChecks,
  type AdvertCheck,
} from "@/lib/advert-completeness";
import { ADVERTS_ENABLED, PHOTOS_ENABLED } from "@/lib/phase-one";
import { SalesHighlightsCard } from "./sales-highlights-card";
import { OverviewPricingCard } from "./overview-pricing-card";

interface OverviewTabProps {
  vehicle: Vehicle;
  /** Merge fresh fields into the page's Vehicle state (e.g. after a
   *  live AutoTrader valuation refresh). */
  onVehiclePatch?: (patch: Partial<Vehicle>) => void;
  /** Jump to a detail tab (empty-state CTAs route the first actions). */
  onNavigate?: (tab: string) => void;
  /** Re-pull the vehicle after an inline edit (GEN-100). */
  onChanged?: () => void;
}

/**
 * Overview tab — the dealership's "at-a-glance everything I need" surface.
 * One card of figures up top (web price, profit, days in stock, AutoTrader
 * retail and its valuation), then pricing, location and sales highlights;
 * with adverts on, advert completeness on the left and marketplace joins
 * the stack on the right.
 */
export function OverviewTab({
  vehicle,
  onVehiclePatch,
  onNavigate,
  onChanged,
}: OverviewTabProps) {
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  /**
   * Bumped after an inline pricing edit. The KPI strip reads `listing.price`
   * in preference to the vehicle's own `listingPrice`, so re-pulling only the
   * vehicle would leave Net Profit computed from a stale listing — the edit
   * would appear to half-apply.
   */
  const [listingToken, setListingToken] = useState(0);

  useEffect(() => {
    void listingService.getForVehicle(vehicle.id).then(setListing);
  }, [vehicle.id, listingToken]);

  const webPrice = listing?.price ?? vehicle.listingPrice ?? 0;
  const { refreshing, refreshValuation } = useValuationRefresh(
    vehicle,
    onVehiclePatch,
  );

  // A brand-new vehicle has nothing to glance at yet (no valuation, no price,
  // no photos). Rather than a wall of "—" cards, guide the first action.
  const isNew =
    listing !== undefined &&
    vehicle.atRetailValuation == null &&
    webPrice <= 0 &&
    (vehicle.imagesCount ?? 0) === 0;
  if (isNew) {
    return <EmptyOverview vehicleId={vehicle.id} onNavigate={onNavigate} />;
  }
  const cards = (
    <>
      <OverviewPricingCard
        vehicle={vehicle}
        listing={listing ?? null}
        onChanged={() => {
          setListingToken((t) => t + 1);
          onChanged?.();
        }}
      />
      <VehicleLocationSection vehicle={vehicle} />
      <SalesHighlightsCard vehicle={vehicle} />
      {ADVERTS_ENABLED ? <MarketplacePanel listing={listing ?? null} /> : null}
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* The four figures and AutoTrader's valuation in one card. */}
      <OverviewStats
        vehicle={vehicle}
        webPrice={webPrice}
        refreshing={refreshing}
        onRefresh={() => void refreshValuation()}
      />

      {ADVERTS_ENABLED ? (
        // Two-col: Advert Completeness + Valuation/Marketplace stack
        <div className="grid gap-4 @3xl:grid-cols-[1.5fr_1fr]">
          <AdvertCompletenessPanel
            vehicle={vehicle}
            listing={listing ?? null}
            photoCount={vehicle.imagesCount}
          />
          <div className="flex flex-col gap-4">{cards}</div>
        </div>
      ) : (
        <div className="grid items-stretch gap-4 @3xl:grid-cols-3">{cards}</div>
      )}

    </div>
  );
}

// ============================================================
// Empty state — a brand-new vehicle with nothing set up yet
// ============================================================

function EmptyOverview({
  vehicleId,
  onNavigate,
}: {
  vehicleId: string;
  onNavigate?: (tab: string) => void;
}) {
  return (
    <EmptyState
      icon={<Rocket />}
      heading="New to stock, let's get it sale-ready"
      action={{
        content: "Start inspection",
        onAction: () => onNavigate?.("inspection"),
      }}
      secondaryAction={
        PHOTOS_ENABLED
          ? { content: "Add photos", onAction: () => onNavigate?.("photos") }
          : undefined
      }
      footerContent={
        <div className="flex flex-col items-center gap-3">
          <Button variant="plain" url={`/vehicles/${vehicleId}/advert`}>
            Set price
          </Button>
          <span>
            Then: prep &amp; repairs, {PHOTOS_ENABLED ? "photos, " : ""}price, advert, list
          </span>
        </div>
      }
    >
      There&apos;s no advert, valuation or pricing yet. The first step is a
      quick inspection: everything else follows from what it finds.
    </EmptyState>
  );
}

// ============================================================
// Advert Completeness — checklist driven from Listing + Vehicle
// ============================================================

function AdvertCompletenessPanel({
  vehicle,
  listing,
  photoCount,
}: {
  vehicle: Vehicle;
  listing: Listing | null;
  photoCount: number;
}) {
  const checks = computeAdvertChecks(vehicle, listing, photoCount);
  const setCount = checks.filter((c) => c.state === "done").length;

  return (
    <Panel
      title="Advert completeness"
      subtitle={`${setCount} of ${checks.length} fields set · ${checks.length - setCount} to address`}
      action={
        <Button variant="plain" url={`/vehicles/${vehicle.id}/advert`}>
          Open advert
        </Button>
      }
      flush
    >
      <div className="px-4 pb-3">
        <ProgressBar
          progress={(setCount / checks.length) * 100}
          size="small"
          tone="success"
          accessibilityLabel="Advert completeness"
        />
      </div>
      <div className="divide-y divide-(--border-secondary) border-t border-(--border-secondary)">
        {checks.map((c) => (
          <AdvertCheckRow key={c.key} check={c} vehicleId={vehicle.id} />
        ))}
      </div>
    </Panel>
  );
}

const STATE_MARK_STYLES: Record<AdvertCheck["state"], string> = {
  done: "bg-(--bg-surface-success) text-(--icon-success)",
  warn: "bg-(--bg-surface-caution) text-(--icon-caution)",
  miss: "bg-(--bg-fill-secondary) text-(--icon-secondary)",
};

const STATE_PILL_TONE: Record<AdvertCheck["state"], React.ComponentProps<typeof Pill>["tone"]> = {
  done: "good",
  warn: "warn",
  miss: "bad",
};

const STATE_PILL_LABEL: Record<AdvertCheck["state"], string> = {
  done: "Set",
  warn: "Needs work",
  miss: "Missing",
};

const EDIT_ANCHOR: Record<string, string> = {
  taxonomy: "taxonomy",
  description: "description",
  pricing: "channels",
  channels: "channels",
  photos: "website",
};

function editHref(vehicleId: string, key: string): string {
  const anchor = EDIT_ANCHOR[key];
  return anchor
    ? `/vehicles/${vehicleId}/advert#${anchor}`
    : `/vehicles/${vehicleId}/advert`;
}

function AdvertCheckRow({
  check,
  vehicleId,
}: {
  check: AdvertCheck;
  vehicleId: string;
}) {
  return (
    <div className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full",
          STATE_MARK_STYLES[check.state],
        )}
      >
        {check.state === "done" ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : check.state === "warn" ? (
          <AlertCircle className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" strokeWidth={3} />
        )}
      </span>
      <div className="min-w-0">
        <div className="body-md-semibold">{check.name}</div>
        <div className="mt-0.5 truncate body-md text-(--text-secondary)">
          {check.meta}
        </div>
      </div>
      <Pill tone={STATE_PILL_TONE[check.state]}>
        {STATE_PILL_LABEL[check.state]}
      </Pill>
      <Button
        variant="tertiary"
        size="micro"
        icon="EditMinor"
        url={editHref(vehicleId, check.key)}
        accessibilityLabel={`Edit ${check.name}`}
      >
        Edit
      </Button>
    </div>
  );
}

// ============================================================
// Valuation refresh
// ============================================================

/**
 * Pull a live AutoTrader valuation for this vehicle and persist it.
 * Client-orchestrated: /api/vehicle/lookup returns valuations server-side
 * (creds stay there), then we persist via the RLS-scoped vehicle service
 * — no admin/service-role key needed.
 */
function useValuationRefresh(
  vehicle: Vehicle,
  onVehiclePatch?: (patch: Partial<Vehicle>) => void,
) {
  const [refreshing, setRefreshing] = useState(false);

  async function refreshValuation() {
    setRefreshing(true);
    try {
      const data = await dvlaService.lookup(vehicle.registration, {
        mileage: vehicle.mileage,
        force: true,
      });
      if (!data || data.retailValuation == null) {
        toast.error(
          "AutoTrader returned no valuation for this registration.",
        );
        return;
      }
      const ratio =
        vehicle.listingPrice && data.retailValuation
          ? vehicle.listingPrice / data.retailValuation
          : null;
      const atPriceIndicator =
        ratio == null
          ? null
          : ratio <= 0.96
            ? "great"
            : ratio <= 1.0
              ? "good"
              : ratio <= 1.05
                ? "above_average"
                : "high";
      const patch: Partial<Vehicle> = {
        atRetailValuation: data.retailValuation ?? null,
        atTradeValuation: data.tradeValuation ?? null,
        atPartExchangeValuation: data.partExchangeValuation ?? null,
        atPrivateValuation: data.privateValuation ?? null,
        atValuationAt: new Date().toISOString(),
        atPriceIndicator,
        derivative: data.derivative ?? null,
        generation: data.generation ?? null,
        trim: data.trim ?? null,
        atDerivativeId: data.atDerivativeId ?? null,
      };
      await vehicleService.updateValuation(vehicle.id, patch);
      onVehiclePatch?.(patch);
      toast.success(
        `AutoTrader valuation updated, retail ${formatCurrency(data.retailValuation)}`,
      );
    } catch (e) {
      toast.error(`Valuation refresh failed: ${String(e)}`);
    } finally {
      setRefreshing(false);
    }
  }

  return { refreshing, refreshValuation };
}

// ============================================================
// Marketplace panel
// ============================================================

function MarketplacePanel({ listing }: { listing: Listing | null }) {
  type ChannelKey = "carcapital" | "autotrader" | "ebay" | "facebook";
  const rows: { key: ChannelKey; name: string; meta: string; iconBg: string; iconText: string }[] = [
    {
      key: "carcapital",
      name: "Car Capital UK",
      meta: "thecarcapital.co.uk",
      iconBg: "bg-(--bg-fill-brand) text-(--text-brand-on-bg-fill)",
      iconText: "CC",
    },
    {
      key: "autotrader",
      name: "AutoTrader",
      meta: listing ? "Synced" : "Not configured",
      iconBg: "bg-(--bg-fill-info) text-(--text-info-on-bg-fill)",
      iconText: "AT",
    },
    {
      key: "ebay",
      name: "eBay Motors",
      meta: "Not configured",
      iconBg: "bg-(--bg-fill-critical) text-(--text-critical-on-bg-fill)",
      iconText: "eB",
    },
    {
      key: "facebook",
      name: "Facebook",
      meta: "Not configured",
      iconBg: "bg-(--bg-fill-emphasis) text-(--text-emphasis-on-bg-fill)",
      iconText: "fb",
    },
  ];

  const isOn = (key: ChannelKey) => {
    if (!listing) return false;
    return key === "carcapital"
      ? listing.channels.website
      : key === "autotrader"
        ? listing.channels.autotrader
        : key === "ebay"
          ? listing.channels.ebay
          : listing.channels.facebook;
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-(--icon-secondary)" />
          Marketplace
        </span>
      }
      flush
    >
      <div className="divide-y divide-(--border-secondary)">
        {rows.map((r) => {
          const on = isOn(r.key);
          return (
            <div
              key={r.key}
              className="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-4 py-3"
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-(--radius-100) font-mono body-xs-semibold tracking-wider",
                  r.iconBg,
                )}
              >
                {r.iconText}
              </span>
              <div className="min-w-0">
                <div className="body-md-semibold">{r.name}</div>
                <div className="mt-0.5 body-md text-(--text-secondary)">

                  {r.meta}
                </div>
              </div>
              {on ? <Pill tone="good">Live</Pill> : <Pill tone="neutral">Off</Pill>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
