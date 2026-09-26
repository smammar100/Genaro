"use client";

import { Controller } from "react-hook-form";
import { Card, Select } from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { BODY_TYPES, FUEL_TYPES } from "@/lib/constants";
import {
  VEHICLE_CATEGORY_OPTIONS,
  vehicleCategory,
  vehicleCategoryPatch,
} from "@/lib/master-sheet";
import { DvlaSelect, Field, Important, optionLabel } from "./fields";
import { TRANSMISSION_OPTIONS, type ArrivalFormApi, type FieldIds } from "./schema";

/** Vehicle identity (sheet B–K). `auto` marks the fields DVLA filled in. */
export function IdentityCard({
  form,
  ids,
  auto,
}: {
  form: ArrivalFormApi;
  ids: FieldIds;
  /** The last lookup matched, so the DVLA-filled fields get a badge. */
  auto: boolean;
}) {
  const errors = form.formState.errors;
  const [vehicleType, bodyType] = form.watch(["vehicleType", "bodyType"]);

  return (
    <Card title="Vehicle identity">
      <p className="body-sm text-(--text-secondary)">
        Auto-filled from DVLA + AutoTrader
      </p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Field
          label={<>Mileage <Important /></>}
          htmlFor={ids.mileage}
          error={errors.mileage?.message}
        >
          <Input id={ids.mileage} type="number" min={0} {...form.register("mileage")} />
        </Field>
        <Field label={<>Make <Important /></>} htmlFor={ids.make} auto={auto}>
          <Input id={ids.make} {...form.register("make")} />
        </Field>
        <Field label={<>Model <Important /></>} htmlFor={ids.model} auto={auto}>
          <Input id={ids.model} {...form.register("model")} />
        </Field>
        <Field label="Variant name" htmlFor={ids.variantName}>
          <Input id={ids.variantName} placeholder="e.g. LX 35H" {...form.register("variantName")} />
        </Field>
        <Field label="Variant code" htmlFor={ids.variantCode}>
          <Input id={ids.variantCode} placeholder="From the BCA invoice, e.g. 1.5 SE" {...form.register("variantCode")} />
        </Field>
        <Field label="Year" htmlFor={ids.year} auto={auto} error={errors.year?.message}>
          <Input id={ids.year} type="number" {...form.register("year")} />
        </Field>
        <Field label={<>Colour <Important /></>} htmlFor={ids.colour} auto={auto}>
          <Input id={ids.colour} {...form.register("colour")} />
        </Field>
        {/* Sheet col G: CAR / SUV / MPV / VAN — one choice that sets both
            the type and, for SUV/MPV, the body. */}
        <Select
          id={ids.vehicleType}
          label="Vehicle type"
          options={VEHICLE_CATEGORY_OPTIONS}
          value={vehicleCategory({ vehicleType, bodyType })}
          onChange={(cat) => {
            const next = vehicleCategoryPatch(cat, {
              bodyType: form.getValues("bodyType"),
            });
            form.setValue("vehicleType", next.vehicleType);
            form.setValue("bodyType", next.bodyType);
          }}
        />
        <Controller
          control={form.control}
          name="bodyType"
          render={({ field }) => (
            <Select
              id={ids.bodyType}
              label="Body type"
              options={BODY_TYPES.map((b) => ({ value: b, label: optionLabel(b) }))}
              value={field.value}
              onChange={(v) => field.onChange(v)}
            />
          )}
        />
        <Controller
          control={form.control}
          name="fuelType"
          render={({ field }) => (
            <DvlaSelect
              id={ids.fuelType}
              label="Fuel type"
              auto={auto}
              options={FUEL_TYPES.map((f) => ({ value: f, label: optionLabel(f) }))}
              value={field.value}
              onChange={(v) => field.onChange(v)}
            />
          )}
        />
        <Controller
          control={form.control}
          name="transmission"
          render={({ field }) => (
            <Select
              id={ids.transmission}
              label="Transmission"
              options={[...TRANSMISSION_OPTIONS]}
              value={field.value}
              onChange={(v) => field.onChange(v)}
            />
          )}
        />
        <Field label="Engine size (cc)" htmlFor={ids.engineSize}>
          <Input id={ids.engineSize} type="number" {...form.register("engineSizeCC")} />
        </Field>
        <Field label="MOT expiry" htmlFor={ids.motExpiry}>
          <Input id={ids.motExpiry} type="date" {...form.register("motExpiry")} />
        </Field>
        <Field
          label="Legacy S/N"
          htmlFor={ids.legacySerial}
          error={errors.legacySerialNumber?.message}
        >
          <Input
            id={ids.legacySerial}
            type="number"
            min={1}
            placeholder="Only for a car from the old Excel sheet"
            {...form.register("legacySerialNumber")}
          />
        </Field>
      </div>
    </Card>
  );
}
