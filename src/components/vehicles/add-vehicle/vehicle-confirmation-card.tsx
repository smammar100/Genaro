"use client";

import { Car } from "lucide-react";
import { Badge, Button, Card, Thumbnail } from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";
import { formatDate } from "@/lib/utils";
import { optionLabel } from "./fields";
import type { ArrivalFormApi } from "./schema";

/**
 * The car the lookup found, shown once DVLA returned data so the user can
 * confirm it's the right one before filling in the rest. Reads the live form
 * values, so it follows any edits made in the identity card.
 */
export function VehicleConfirmationCard({
  form,
  inStock,
  onEdit,
}: {
  form: ArrivalFormApi;
  /** The reg is already in the stock book. */
  inStock: boolean;
  onEdit: () => void;
}) {
  const [registration, year, make, model, colour, fuelType, engineSizeCC, motExpiry] =
    form.watch([
      "registration",
      "year",
      "make",
      "model",
      "colour",
      "fuelType",
      "engineSizeCC",
      "motExpiry",
    ]);

  const title = [year, make, model].filter((v) => v && String(v).trim()).join(" ");
  const cc = Number(engineSizeCC);
  const details = [
    colour?.trim(),
    fuelType ? optionLabel(fuelType) : null,
    engineSizeCC && Number.isFinite(cc) && cc > 0 ? `${cc.toLocaleString()}cc` : null,
    motExpiry ? `MOT until ${formatDate(motExpiry)}` : null,
  ].filter(Boolean);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4">
        <Thumbnail source={<Car />} size="large" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RegPlate registration={registration ?? ""} size="sm" />
            <Badge tone="success" progress="complete">
              Found on DVLA
            </Badge>
            {inStock ? <Badge tone="info">In stock</Badge> : null}
          </div>
          <p className="heading-md mt-1">{title || "Vehicle found"}</p>
          {details.length > 0 ? (
            <p className="body-sm text-(--text-secondary)">{details.join(" · ")}</p>
          ) : null}
        </div>
        <Button variant="plain" onClick={onEdit}>
          Edit details
        </Button>
      </div>
    </Card>
  );
}
