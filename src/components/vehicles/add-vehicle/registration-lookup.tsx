"use client";

import { Loader2, Search } from "lucide-react";
import { Badge, Banner, Button, Card, Link as PolarisLink } from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Important } from "./fields";
import { UNREGISTERED, type ArrivalFormApi } from "./schema";

export type DvlaState = "idle" | "loading" | "found" | "not_found" | "duplicate";

/**
 * "Start with the registration": the reg field and lookup button, then the
 * lookup's outcome (checking / found / not found / already in stock). The
 * lookup itself lives in ArrivalForm; this card only triggers and shows it.
 */
export function RegistrationLookupCard({
  form,
  fieldId,
  dvlaState,
  duplicate,
  duplicateHref,
  loadingSeconds,
  onLookup,
}: {
  form: ArrivalFormApi;
  fieldId: string;
  dvlaState: DvlaState;
  duplicate: { stockId: string; label: string } | null;
  duplicateHref: string | null;
  /** Seconds the lookup has been running (ArrivalForm ticks it). */
  loadingSeconds: number | null;
  onLookup: () => void;
}) {
  const registration = form.watch("registration") ?? "";
  const regClean = registration.replace(/[^A-Za-z0-9]/g, "");

  return (
    <Card
      title={
        // Every car added here starts as Received (see ArrivalForm's onSubmit).
        <span className="flex flex-wrap items-center gap-2">
          Start with the registration
          <Badge tone="info">Received</Badge>
        </span>
      }
    >
      <p className="body-sm text-(--text-secondary)">
        We check your stock book and fill make, year, colour and fuel from
        DVLA.
      </p>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Label htmlFor={fieldId}>
            Registration <Important />
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative w-52">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--icon-secondary)" />
              <Input
                id={fieldId}
                {...form.register("registration")}
                onBlur={onLookup}
                placeholder="GK66 6NX"
                className="pl-9 font-mono uppercase tracking-wider"
              />
            </div>
            <Button
              icon={dvlaState === "loading" ? undefined : "WandMinor"}
              onClick={onLookup}
              loading={dvlaState === "loading"}
            >
              Look up
            </Button>
          </div>
        </div>
        {regClean.length >= 4 && (
          <RegPlate registration={registration} size="lg" className="ml-auto" />
        )}
      </div>
      {dvlaState === "idle" && (
        <p className="body-sm text-(--text-secondary)">
          No registration yet? Leave it blank and the car is saved as{" "}
          {UNREGISTERED}. You can add the reg later.
        </p>
      )}
      {dvlaState === "loading" && (
        <p className="flex items-center gap-1 body-sm text-(--text-secondary)">
          <Loader2 className="size-3 animate-spin" />
          Checking DVLA and your stock book
          {loadingSeconds !== null ? ` (${loadingSeconds}s)` : ""}
          …
        </p>
      )}
      {dvlaState === "found" && (
        <Banner tone="success">
          Matched: make / model / derivative, tax, MOT and valuation
          auto-filled from DVLA + AutoTrader.
        </Banner>
      )}
      {dvlaState === "not_found" && (
        <Banner tone="warning">
          The number is incorrect. Try again, or fill in the form manually.
        </Banner>
      )}
      {dvlaState === "duplicate" && duplicate && duplicateHref && (
        <Banner tone="info">
          This car is already in your stock book as{" "}
          <PolarisLink url={duplicateHref}>{duplicate.stockId}</PolarisLink>
          {duplicate.label ? ` (${duplicate.label})` : ""}.
        </Banner>
      )}
    </Card>
  );
}
