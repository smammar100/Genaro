"use client";

import { Controller } from "react-hook-form";
import { Card, Select } from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { AUCTION_HOUSES, FINANCE_PROVIDERS } from "@/lib/constants";
import { AUCTION_HOUSE_SUGGESTIONS, OWNED_BY_SUGGESTIONS } from "@/lib/master-sheet";
import type { DealerPartner } from "@/lib/types";
import { Field, Important } from "./fields";
import { SOURCE_OPTIONS, type ArrivalFormApi, type FieldIds } from "./schema";

/** Buying (sheet L–P + seller): where the car came from and who owns it. */
export function BuyingCard({
  form,
  ids,
  partners,
  selectedPartnerId,
  onPartnerChange,
}: {
  form: ArrivalFormApi;
  ids: FieldIds;
  partners: DealerPartner[];
  selectedPartnerId: string;
  onPartnerChange: (id: string) => void;
}) {
  const watchedSource = form.watch("purchaseSource");

  return (
    <Card title="Buying">
      <p className="body-sm text-(--text-secondary)">
        Where the car came from and who owns it
      </p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Field label={<>Seller name <Important /></>} htmlFor={ids.sellerName}>
          <Input id={ids.sellerName} {...form.register("sellerName")} />
        </Field>
        <Field label="Seller phone" htmlFor={ids.sellerPhone}>
          <Input id={ids.sellerPhone} {...form.register("sellerPhone")} />
        </Field>
        <Controller
          control={form.control}
          name="purchaseSource"
          render={({ field }) => (
            <Select
              id={ids.sourceType}
              label="Source type"
              options={[...SOURCE_OPTIONS]}
              value={field.value}
              onChange={(v) => field.onChange(v)}
            />
          )}
        />
        {watchedSource === "dealer" && (
          <Select
            id={ids.dealerPartner}
            label="Dealer partner"
            placeholder="Select dealer partner…"
            options={
              partners.length === 0
                ? [{ value: "__none", label: "No dealer partners", disabled: true }]
                : partners.map((p) => ({
                    value: p.id,
                    label: `${p.companyName ?? p.name}${p.companyName ? ` (${p.name})` : ""}`,
                  }))
            }
            value={selectedPartnerId}
            onChange={onPartnerChange}
          />
        )}
        <Controller
          control={form.control}
          name="localOrImport"
          render={({ field }) => (
            <Select
              id={ids.localOrImport}
              label="Local or import"
              options={[
                { value: "local", label: "Local" },
                { value: "import", label: "Import" },
              ]}
              value={field.value}
              onChange={(v) => field.onChange(v)}
            />
          )}
        />
        {/* Free text with suggestions: the sheet holds places (BLACKBUSHE,
            CAMBERLEY) and terms (SOR, PARTEX) that a fixed list would reject. */}
        <Field label={<>Auction house <Important /></>} htmlFor={ids.auctionHouse}>
          <Input
            id={ids.auctionHouse}
            list={ids.auctionHouseList}
            placeholder="e.g. BCA AUCTION, SOR, PARTEX"
            {...form.register("auctionHouse")}
          />
          <datalist id={ids.auctionHouseList}>
            {[...new Set([...AUCTION_HOUSE_SUGGESTIONS, ...AUCTION_HOUSES.map((h) => h.toUpperCase())])].map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </Field>
        <Field label={<>Owned by <Important /></>} htmlFor={ids.ownedBy}>
          <Input
            id={ids.ownedBy}
            list={ids.ownedByList}
            placeholder="BCA, CAR CAPITAL, INFINIT…"
            {...form.register("ownedBy")}
          />
          <datalist id={ids.ownedByList}>
            {OWNED_BY_SUGGESTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field label="Owner details" htmlFor={ids.ownerDetails}>
          <Input
            id={ids.ownerDetails}
            placeholder="Name of the owner"
            {...form.register("ownerDetails")}
          />
        </Field>
        <Field label={<>Invoice date <Important /></>} htmlFor={ids.invoiceDate}>
          <Input id={ids.invoiceDate} type="date" {...form.register("invoiceDate")} />
        </Field>
        <Field label="Credit note date" htmlFor={ids.creditNoteDate}>
          <Input id={ids.creditNoteDate} type="date" {...form.register("creditNoteDate")} />
        </Field>
        <Controller
          control={form.control}
          name="financeProvider"
          render={({ field }) => (
            <Select
              id={ids.financeProvider}
              label="Stocking finance"
              options={FINANCE_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
              value={field.value}
              onChange={(v) => field.onChange(v)}
            />
          )}
        />
      </div>
    </Card>
  );
}
