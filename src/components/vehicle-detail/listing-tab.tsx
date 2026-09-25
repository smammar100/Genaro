"use client";
import { variantLabel } from "@/lib/vehicle-variant";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import type { Listing, Vehicle } from "@/lib/types";
import { listingService } from "@/lib/services/listing-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Banner, Button, EmptyState, Tag } from "@/components/polaris";
import { Field, FieldGrid, Panel } from "./primitives";
import { usePermissions } from "@/hooks/use-permissions";
import {
  DescriptionEditor,
  HighlightsEditor,
} from "./listing-inline-editor";

interface ListingTabProps {
  vehicle: Vehicle;
}

/**
 * Listing tab (Variation A — refined record). A read-only summary of how this
 * vehicle is advertised: the AutoTrader taxonomy spec, the description, the
 * website highlights (as bullets) and selected equipment. Editing happens in
 * the Advert editor — the single "Edit Advert" action links there.
 */
export function ListingTab({ vehicle }: ListingTabProps) {
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  const [refreshToken, setRefreshToken] = useState(0);
  const { can, isSuperUser } = usePermissions();
  const canEditAdvert = isSuperUser || can("advert:edit");
  const refresh = () => setRefreshToken((t) => t + 1);

  useEffect(() => {
    void listingService.getForVehicle(vehicle.id).then(setListing);
  }, [vehicle.id, refreshToken]);

  if (listing === undefined) {
    return (
      <Panel title="Listing" subtitle="Loading…">
        <Skeleton className="h-32 w-full" />
      </Panel>
    );
  }

  if (listing === null) {
    return (
      <EmptyState
        icon={<Megaphone />}
        heading="Not listed yet"
        action={{
          content: "Open advert editor",
          url: `/vehicles/${vehicle.id}/advert`,
        }}
      >
        Vehicles in &lsquo;ready&rsquo; status can be listed for sale.
      </EmptyState>
    );
  }

  const advert = listing.advertData;
  const tax = advert?.taxonomy ?? {};

  // Highlights: prefer the structured advertData; fall back to the legacy
  // delimited specialFeatures string. Drop blanks.
  const highlights = (
    advert?.highlights?.length
      ? advert.highlights
      : listing.specialFeatures.split(/[•\n;]/)
  )
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, 5);

  const features = advert?.features ?? [];
  const descChars = listing.description?.length ?? 0;
  const engineSize =
    tax.engineSize ||
    (vehicle.engineSizeCC ? `${(vehicle.engineSizeCC / 1000).toFixed(1)}` : "—");

  return (
    <div className="flex flex-col gap-4">
      <Banner tone="info" icon={<Megaphone />}>
        Mapped to AutoTrader&apos;s taxonomy: get it wrong and the advert is
        filtered out of search results entirely. This is how buyers see the
        car across AutoTrader, the website and partner channels.
      </Banner>

      <Panel
        title="Advert specification"
        subtitle="Mapped to AutoTrader's product hierarchy"
        action={
          <Button variant="plain" url={`/vehicles/${vehicle.id}/advert`}>
            Edit advert
          </Button>
        }
      >
        <FieldGrid cols={4}>
          <Field label="Make">{tax.make ?? vehicle.make}</Field>
          <Field label="Model">{tax.model ?? vehicle.model}</Field>
          <Field label="Generation" muted={!(tax.generation ?? vehicle.generation)}>
            {tax.generation ??
              vehicle.generation ??
              `${vehicle.bodyType.toUpperCase()} (${vehicle.year - 2} – ${vehicle.year + 5})`}
          </Field>
          <Field label="Trim">
            {tax.trim ?? vehicle.trim ?? vehicle.variantName ?? "—"}
          </Field>
          <Field label="Fuel type">
            <span className="capitalize">{tax.fuelType ?? vehicle.fuelType}</span>
          </Field>
          <Field label="Engine size">{engineSize}</Field>
          <Field label="Transmission">
            <span className="capitalize">
              {tax.transmission ?? vehicle.transmission}
            </span>
          </Field>
          <Field label="Derivative">
            {tax.derivative ?? variantLabel(vehicle)}
          </Field>
        </FieldGrid>
      </Panel>

      <Panel
        title="Vehicle description"
        subtitle={`${descChars.toLocaleString()} chars`}
      >
        <DescriptionEditor
          listing={listing}
          canEdit={canEditAdvert}
          onSaved={refresh}
        />
      </Panel>

      <Panel
        title="Website highlights"
        subtitle="Shown as bullet points on the listing card"
      >
        <HighlightsEditor
          listing={listing}
          current={highlights}
          canEdit={canEditAdvert}
          onSaved={refresh}
        />
      </Panel>

      {features.length > 0 && (
        <Panel
          title="Equipment"
          subtitle={`${features.length} feature${features.length === 1 ? "" : "s"}`}
        >
          <div className="flex flex-wrap gap-2">
            {features.map((f) => (
              <Tag key={f}>{f}</Tag>
            ))}
          </div>

        </Panel>
      )}
    </div>
  );
}
