"use client";

import { Card } from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { Field } from "./fields";
import type { ArrivalFormApi, FieldIds } from "./schema";

/** Pricing: optional, and can be set later on the vehicle page. */
export function PricingCard({ form, ids }: { form: ArrivalFormApi; ids: FieldIds }) {
  const errors = form.formState.errors;
  return (
    <Card title="Pricing">
      <p className="body-sm text-(--text-secondary)">Optional, can set later</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        <Field label="Warranty cost £" htmlFor={ids.warrantyCost} error={errors.warrantyCost?.message}>
          <Input id={ids.warrantyCost} type="number" step="0.01" min={0} {...form.register("warrantyCost")} />
        </Field>
        <Field label="Minimum sale price £" htmlFor={ids.minimumSalePrice} error={errors.minimumSalePrice?.message}>
          <Input id={ids.minimumSalePrice} type="number" step="0.01" min={0} {...form.register("minimumSalePrice")} />
        </Field>
        <Field label="Listing price £" htmlFor={ids.listingPrice} error={errors.listingPrice?.message}>
          <Input id={ids.listingPrice} type="number" step="0.01" min={0} {...form.register("listingPrice")} />
        </Field>
      </div>
    </Card>
  );
}
