"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { variantLabel } from "@/lib/vehicle-variant";
import { Car, CalendarClock, Megaphone, MessageSquare } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { listingService } from "@/lib/services/listing-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import {
  performanceService,
  type VehicleEnquiry,
} from "@/lib/services/performance-service";
import type {
  Listing,
  ListingStatus,
  Vehicle,
} from "@/lib/types";
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Modal,
  Page,
  Select,
  TextField,
  type BadgeTone,
} from "@/components/polaris";
import { Switch } from "@/components/ui/switch";
import { DaysInStockChip } from "@/components/shared/days-in-stock-chip";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { AtIndicatorCell } from "@/components/data-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";

const CHANNELS = ["website", "autotrader", "ebay", "facebook"] as const;
type Channel = (typeof CHANNELS)[number];

const CHANNEL_LABELS: Record<Channel, string> = {
  website: "Website",
  autotrader: "AutoTrader",
  ebay: "eBay",
  facebook: "Facebook",
};

// Listing-status badges: a draft/live/reserved/sold/archived advert reads the
// same here as in the Master Sheet. Sold and archived stay neutral (no tone).
const LISTING_STATUS_META: Record<
  ListingStatus,
  { label: string; tone?: BadgeTone }
> = {
  draft: { label: "Draft", tone: "info" },
  live: { label: "Live", tone: "success" },
  reserved: { label: "Reserved", tone: "attention" },
  sold: { label: "Sold" },
  archived: { label: "Archived" },
};

function ListingStatusBadge({ status }: { status: ListingStatus }) {
  const m = LISTING_STATUS_META[status] ?? LISTING_STATUS_META.draft;
  return (
    <Badge tone={m.tone} className="shrink-0 whitespace-nowrap">
      {m.label}
    </Badge>
  );
}

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Live", value: "live" },
  { label: "Reserved", value: "reserved" },
  { label: "Sold", value: "sold" },
  { label: "Archived", value: "archived" },
];

const CHANNEL_OPTIONS = [
  { label: "All channels", value: "all" },
  ...CHANNELS.map((c) => ({ label: CHANNEL_LABELS[c], value: c })),
];

const AT_INDICATOR_OPTIONS = [
  { label: "Great", value: "great" },
  { label: "Good", value: "good" },
  { label: "Above average", value: "above_average" },
  { label: "High (overpriced)", value: "high" },
  { label: "Unrated", value: "unrated" },
];

function PreviewStat({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-(--radius-200) bg-(--bg-surface-secondary) px-3 py-2.5">
      <div className="body-sm mb-1 inline-flex items-center gap-1.5 text-(--text-secondary)">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="heading-sm">{children}</div>
    </div>
  );
}

interface ListingRow extends Listing {
  vehicle: Vehicle | null;
}

const schema = z.object({
  vehicleId: z.string().min(1, "Pick a vehicle"),
  title: z.string().min(1, "Enter a title"),
  description: z.string().min(1, "Enter a description"),
  price: z.coerce.number().min(0),
  specialFeatures: z.string(),
  atPriceIndicator: z.enum([
    "great",
    "good",
    "above_average",
    "high",
    "unrated",
  ]),
  website: z.boolean(),
  autotrader: z.boolean(),
  ebay: z.boolean(),
  facebook: z.boolean(),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function ListingsPage() {
  const { user, company } = useAuth();
  const router = useRouter();
  const formIdBase = useId();
  const vehicleFieldId = `${formIdBase}-vehicle`;
  const titleFieldId = `${formIdBase}-title`;
  const descriptionFieldId = `${formIdBase}-description`;
  const priceFieldId = `${formIdBase}-price`;
  const atIndicatorFieldId = `${formIdBase}-at-indicator`;
  const specialFeaturesFieldId = `${formIdBase}-special-features`;
  const { can, isSuperUser } = usePermissions();
  const canPublishAT = isSuperUser || can("listing:publish_autotrader");
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  // Live enquiry counts derived from leads — the same single source of truth
  // the Performance page uses, so the two pages never disagree. The
  // denormalised `listings.enquiries_count` column is never incremented.
  const [enquiriesByVehicle, setEnquiriesByVehicle] = useState<
    Record<string, VehicleEnquiry>
  >({});
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">("all");
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  // Master-detail selection — the listing shown in the right-hand preview.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // AutoTrader publish confirm — set to the row pending live publish.
  const [atConfirm, setAtConfirm] = useState<ListingRow | null>(null);
  const [atBusy, setAtBusy] = useState(false);
  // Delete confirm — set to the listing pending deletion.
  const [deleteTarget, setDeleteTarget] = useState<ListingRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: "",
      title: "",
      description: "",
      price: 0,
      specialFeatures: "Bluetooth, Cruise Control, Parking Sensors, Alloy Wheels",
      atPriceIndicator: "unrated",
      website: true,
      autotrader: false,
      ebay: false,
      facebook: false,
    },
  });

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      listingService.getAll(company.id),
      vehicleService.getAll(company.id),
      performanceService.getStats(company.id),
    ]).then(([l, v, stats]) => {
      setListings(l);
      setVehicles(v);
      setEnquiriesByVehicle(stats.byVehicle);
    });
  }, [company]);

  const readyVehicles = useMemo(
    () =>
      // Gate creation until listings have loaded: while `listings` is null we
      // can't tell which vehicles already have an advert, so offering any here
      // risks creating a duplicate listing.
      listings === null
        ? []
        : vehicles.filter(
            (v) =>
              (v.status === "ready" || v.status === "listed") &&
              !listings.some((l) => l.vehicleId === v.id),
          ),
    [vehicles, listings],
  );

  const filtered = useMemo<ListingRow[] | null>(() => {
    if (!listings) return null;
    let out = [...listings];
    if (statusFilter !== "all") out = out.filter((l) => l.status === statusFilter);
    if (channelFilter !== "all")
      out = out.filter((l) => l.channels[channelFilter]);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((l) => {
        const v = vehicles.find((x) => x.id === l.vehicleId);
        return (
          l.title.toLowerCase().includes(q) ||
          (v &&
            (v.registration.toLowerCase().includes(q) ||
              v.stockId.toLowerCase().includes(q)))
        );
      });
    }
    // v4.1 Gap 1 / TC-P6-003: hide listings whose vehicle has been removed
    // from website. Sold vehicles still show until that step is taken.
    out = out.filter((l) => {
      const v = vehicles.find((x) => x.id === l.vehicleId);
      return !v || v.removedFromWebsiteAt === null;
    });
    return out.map((l) => ({
      ...l,
      vehicle: vehicles.find((v) => v.id === l.vehicleId) ?? null,
    }));
  }, [listings, statusFilter, channelFilter, search, vehicles]);

  // Keep the selection valid as filters/data change: fall back to the first
  // row when the selected listing drops out of the filtered set.
  useEffect(() => {
    if (!filtered) return;
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((l) => l.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo<ListingRow | null>(
    () => filtered?.find((l) => l.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const watchedVehicle = form.watch("vehicleId");
  const selectedVehicle = useMemo(
    () => vehicles.find((x) => x.id === watchedVehicle) ?? null,
    [vehicles, watchedVehicle],
  );
  useEffect(() => {
    const v = vehicles.find((x) => x.id === watchedVehicle);
    if (!v) return;
    form.setValue(
      "title",
      `${v.year} ${v.make} ${v.model} ${variantLabel(v, "")}`.trim(),
    );
    form.setValue(
      "description",
      `Stunning ${v.colour.toLowerCase()} ${v.make} ${v.model} with ${v.mileage.toLocaleString()} miles. ${v.serviceHistory === "full" ? "Full service history. " : ""}Drives superb.`,
    );
    if (v.listingPrice) form.setValue("price", v.listingPrice);
    // Seed the AutoTrader price indicator from the captured valuation.
    if (v.atRetailValuation && v.listingPrice) {
      const ratio = v.listingPrice / v.atRetailValuation;
      // Clearly over-retail cars get the "high" (overpriced) bucket — never
      // silently "unrated", which hid overpriced cars before.
      form.setValue(
        "atPriceIndicator",
        ratio <= 0.96
          ? "great"
          : ratio <= 1.0
            ? "good"
            : ratio <= 1.05
              ? "above_average"
              : "high",
      );
    }
  }, [watchedVehicle, vehicles, form]);

  async function onSubmit(values: FormOutput) {
    if (!user || !company) return;
    const v = vehicles.find((x) => x.id === values.vehicleId);
    if (!v) return;
    await listingService.create(
      {
        companyId: company.id,
        vehicleId: values.vehicleId,
        title: values.title,
        description: values.description,
        price: values.price,
        specialFeatures: values.specialFeatures,
        channels: {
          website: values.website,
          autotrader: values.autotrader,
          ebay: values.ebay,
          facebook: values.facebook,
        },
        atPriceIndicator: values.atPriceIndicator,
      },
      user.id,
    );
    toast.success("Listing created (draft)");
    setOpen(false);
    form.reset();
    setListings(await listingService.getAll(company.id));
  }

  async function handlePublish(id: string) {
    if (!user || !company) return;
    await listingService.publish(id, user.id);
    setListings(await listingService.getAll(company.id));
    toast.success("Listing published");
  }

  async function handleToggleChannel(id: string, ch: Channel) {
    if (!company) return;
    await listingService.toggleChannel(id, ch);
    setListings(await listingService.getAll(company.id));
  }

  async function confirmPublishAutoTrader() {
    if (!atConfirm || !company) return;
    setAtBusy(true);
    try {
      const res = await fetch("/api/autotrader/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: atConfirm.vehicleId,
          listingId: atConfirm.id,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        stockId?: string;
        warnings?: string[];
        error?: string;
        detail?: string;
      };
      if (res.ok && body.stockId) {
        toast.success(`Published to AutoTrader (Stock ID ${body.stockId})`);
        if (body.warnings?.length) {
          for (const w of body.warnings) toast.warning(w);
        }
      } else {
        toast.error(
          body.detail
            ? `AutoTrader publish failed: ${body.detail}`
            : `AutoTrader publish failed (${body.error ?? res.status})`,
        );
      }
      setListings(await listingService.getAll(company.id));
    } catch (e) {
      toast.error(`AutoTrader publish failed: ${String(e)}`);
    } finally {
      setAtBusy(false);
      setAtConfirm(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !user || !company) return;
    setDeleteBusy(true);
    try {
      await listingService.delete(deleteTarget.id, user.id);
      setListings(await listingService.getAll(company.id));
      if (selectedId === deleteTarget.id) setSelectedId(null);
      toast.success("Listing deleted");
    } catch (e) {
      toast.error(`Couldn't delete listing: ${String(e)}`);
    } finally {
      setDeleteBusy(false);
      setDeleteTarget(null);
    }
  }

  const submitCreate = () => void form.handleSubmit(onSubmit)();
  const errors = form.formState.errors;

  return (
    <Page
      title="Work list"
      subtitle="Vehicles ready to advertise. Build each advert, set pricing, and publish it to your sales channels."
      fullWidth
      primaryAction={{
        content: "Create listing",
        onAction: () => setOpen(true),
      }}
    >
      {/* Create listing — react-hook-form state, fields bound via Controller. */}
      <Modal
        open={open}
        onClose={() => {
          if (!form.formState.isSubmitting) setOpen(false);
        }}
        title="Create listing"
        primaryAction={{
          content: "Save draft",
          loading: form.formState.isSubmitting,
          onAction: submitCreate,
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setOpen(false) }]}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitCreate();
          }}
          className="grid gap-4"
        >
          <p className="body-md text-(--text-secondary)">
            Build the advert and choose where it publishes. Saved as a draft.
          </p>
          <Select
            id={vehicleFieldId}
            label="Vehicle"
            placeholder="Pick a ready or listed vehicle"
            options={
              readyVehicles.length === 0
                ? [{ label: "No vehicles available", value: "__none", disabled: true }]
                : readyVehicles.map((v) => ({
                    label: `${v.registration} · ${v.make} ${v.model}`,
                    value: v.id,
                  }))
            }
            value={form.watch("vehicleId")}
            onChange={(v) => form.setValue("vehicleId", v, { shouldValidate: true })}
            error={errors.vehicleId?.message}
          />
          <Controller
            control={form.control}
            name="title"
            render={({ field }) => (
              <TextField
                id={titleFieldId}
                label="Title"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                error={errors.title?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <TextField
                id={descriptionFieldId}
                label="Description"
                name={field.name}
                multiline={4}
                value={field.value}
                onChange={field.onChange}
                error={errors.description?.message}
              />
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <Controller
                control={form.control}
                name="price"
                render={({ field }) => (
                  <TextField
                    id={priceFieldId}
                    label="Price"
                    type="number"
                    prefix="£"
                    name={field.name}
                    value={String(field.value ?? "")}
                    onChange={field.onChange}
                    error={errors.price?.message}
                  />
                )}
              />
              {selectedVehicle?.atRetailValuation != null && (
                <div>
                  <Button
                    variant="plain"
                    onClick={() =>
                      form.setValue(
                        "price",
                        selectedVehicle.atRetailValuation as number,
                      )
                    }
                  >
                    {`Use AutoTrader retail: £${selectedVehicle.atRetailValuation.toLocaleString()}`}
                  </Button>
                </div>
              )}
            </div>
            <Select
              id={atIndicatorFieldId}
              label="AT indicator"
              options={AT_INDICATOR_OPTIONS}
              value={form.watch("atPriceIndicator")}
              onChange={(v) =>
                form.setValue(
                  "atPriceIndicator",
                  v as Listing["atPriceIndicator"],
                )
              }
            />
          </div>
          <Controller
            control={form.control}
            name="specialFeatures"
            render={({ field }) => (
              <TextField
                id={specialFeaturesFieldId}
                label="Special features"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <div className="grid gap-2">
            <p className="body-md-semibold">Publish channels</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              {CHANNELS.map((c) => (
                <label key={c} className="body-md flex items-center gap-2">
                  <Switch
                    checked={form.watch(c)}
                    onCheckedChange={(v) => form.setValue(c, v)}
                  />
                  {CHANNEL_LABELS[c]}
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Master-detail: searchable listing list (left) + advert preview (right) */}
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        {/* LEFT — reg search, filters, and the scrollable listing list */}
        <Card padding="0">
          <div className="flex flex-col gap-2 border-b border-(--border) p-2">
            <TextField
              label="Search listings by registration, stock ID or title"
              labelHidden
              prefix="SearchMinor"
              value={search}
              onChange={setSearch}
              placeholder="Search by reg, stock or title…"
              clearButton
              onClearButtonClick={() => setSearch("")}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Status"
                labelHidden
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as ListingStatus | "all")}
              />
              <Select
                label="Channel"
                labelHidden
                options={CHANNEL_OPTIONS}
                value={channelFilter}
                onChange={(v) => setChannelFilter(v as Channel | "all")}
              />
            </div>
          </div>

          {!filtered ? (
            <div className="flex flex-col gap-1.5 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-(--radius-200)" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState heading="No listings yet" icon="MarketingMinor">
              Mark a vehicle as ready, then create a listing.
            </EmptyState>
          ) : (
            <div
              role="listbox"
              aria-label="Listings"
              className="flex max-h-[calc(100dvh-15rem)] flex-col overflow-y-auto"
            >
              {filtered.map((l) => {
                const isActive = l.id === selectedId;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => setSelectedId(l.id)}
                    className={cn(
                      "flex w-full shrink-0 gap-3 border-t border-(--border-secondary) px-3 py-2.5 text-left transition-colors first:border-t-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--border-focus)",
                      isActive
                        ? "bg-(--bg-surface-selected)"
                        : "hover:bg-(--bg-surface-hover)",
                    )}
                  >
                    {l.vehicle ? (
                      <VehicleImage
                        vehicle={l.vehicle}
                        variant="thumb"
                        className="h-14 w-18 shrink-0 self-center rounded-(--radius-200)"
                      />
                    ) : (
                      <span className="grid h-14 w-18 shrink-0 place-items-center self-center rounded-(--radius-200) bg-(--bg-surface-secondary) text-(--icon-secondary)">
                        <Car className="size-5" />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      {/* Meta row — stock ID + status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-xs text-(--text-secondary)">
                          {l.vehicle?.stockId ?? "—"}
                        </span>
                        <ListingStatusBadge status={l.status} />
                      </div>
                      {/* Title */}
                      <span className="body-md-semibold mt-0.5 truncate">
                        {l.title}
                      </span>
                      {/* Price + enquiries · days */}
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="body-md-numeric">
                          {formatCurrency(l.price)}
                        </span>
                        <span className="body-sm inline-flex shrink-0 items-center gap-1 text-(--text-secondary)">
                          <MessageSquare className="size-3" />
                          {enquiriesByVehicle[l.vehicleId]?.total ?? 0}
                          {l.vehicle ? ` · ${l.vehicle.daysInStock}d` : ""}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* RIGHT — full advert preview for the selected listing */}
        <div className="lg:sticky lg:top-4">
          {!filtered ? (
            <Skeleton className="h-[460px] rounded-(--radius-300)" />
          ) : !selected ? (
            <Card padding="0">
              <EmptyState heading="No listing selected" icon="ViewMinor">
                Select a listing to preview its advert.
              </EmptyState>
            </Card>
          ) : (
            (() => {
              const channelsOn = CHANNELS.filter(
                (c) => selected.channels[c],
              ).length;
              const canPushAT =
                selected.channels.autotrader &&
                canPublishAT &&
                !selected.atStockId;
              return (
                <Card className="gap-4">
                  {/* Header — plate, stock, status, title, price, AT indicator */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {selected.vehicle ? (
                          <RegPlate
                            registration={selected.vehicle.registration}
                            size="sm"
                          />
                        ) : null}
                        <span className="font-mono text-xs text-(--text-secondary)">
                          {selected.vehicle?.stockId ?? "—"}
                        </span>
                        <ListingStatusBadge status={selected.status} />
                      </div>
                      <h2 className="heading-md mt-1.5">{selected.title}</h2>
                    </div>
                    <div className="text-right">
                      <div className="heading-lg tabular-nums">
                        {formatCurrency(selected.price)}
                      </div>
                      <div className="mt-1 flex justify-end">
                        <AtIndicatorCell
                          indicator={selected.atPriceIndicator}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats — days in stock, enquiries, channel coverage */}
                  <div className="grid grid-cols-3 gap-3">
                    <PreviewStat icon={CalendarClock} label="Days in stock">
                      {selected.vehicle ? (
                        <DaysInStockChip days={selected.vehicle.daysInStock} />
                      ) : (
                        "—"
                      )}
                    </PreviewStat>
                    <PreviewStat icon={MessageSquare} label="Enquiries">
                      <span className="tabular-nums">
                        {enquiriesByVehicle[selected.vehicleId]?.total ?? 0}
                      </span>
                    </PreviewStat>
                    <PreviewStat icon={Megaphone} label="Channels">
                      <span className="tabular-nums">{channelsOn}/4</span>
                    </PreviewStat>
                  </div>

                  {/* Publish channels — wired to the live toggle service */}
                  <div>
                    <h3 className="heading-sm mb-2">Publish channels</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CHANNELS.map((c) => {
                        const on = selected.channels[c];
                        return (
                          <div
                            key={c}
                            className={cn(
                              "flex items-center justify-between rounded-(--radius-200) border border-(--border) px-3 py-2.5",
                              on
                                ? "bg-(--bg-surface)"
                                : "bg-(--bg-surface-secondary)",
                            )}
                          >
                            <span className="body-md">{CHANNEL_LABELS[c]}</span>
                            <div className="flex items-center gap-2">
                              {c === "autotrader" && selected.atStockId ? (
                                <Badge tone="success" icon="TickSmallMinor">
                                  Synced
                                </Badge>
                              ) : null}
                              <Switch
                                checked={on}
                                onCheckedChange={() =>
                                  void handleToggleChannel(selected.id, c)
                                }
                                aria-label={`${CHANNEL_LABELS[c]} ${on ? "on" : "off"}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AutoTrader sync state — preserves Synced #id / Error */}
                  {selected.atStockId ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="success" progress="complete">
                        Synced to AutoTrader
                      </Badge>
                      <span className="body-sm text-(--text-secondary)">
                        Stock ID {selected.atStockId.slice(0, 8)}
                      </span>
                    </div>
                  ) : selected.atLastError ? (
                    <div title={selected.atLastError}>
                      <Banner tone="critical">
                        <span className="line-clamp-2">
                          AutoTrader error: {selected.atLastError}
                        </span>
                      </Banner>
                    </div>
                  ) : null}

                  {/* Actions — delete, edit, publish (draft→live), push to AT */}
                  <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-(--border) pt-4">
                    <Button
                      variant="tertiary"
                      tone="critical"
                      icon="DeleteMinor"
                      onClick={() => setDeleteTarget(selected)}
                    >
                      Delete
                    </Button>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <Button
                        icon="EditMinor"
                        onClick={() =>
                          selected.vehicleId &&
                          router.push(`/vehicles/${selected.vehicleId}/advert`)
                        }
                      >
                        Edit advert
                      </Button>
                      {selected.status === "draft" ? (
                        <Button onClick={() => void handlePublish(selected.id)}>
                          Publish
                        </Button>
                      ) : null}
                      {canPushAT ? (
                        <Button onClick={() => setAtConfirm(selected)}>
                          Push to AutoTrader
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })()
          )}
        </div>
      </div>

      {/* AutoTrader publish confirm — gated live write to the sandbox. */}
      <Modal
        open={atConfirm !== null}
        onClose={() => {
          if (!atBusy) setAtConfirm(null);
        }}
        title="Publish to AutoTrader (sandbox)"
        size="small"
        primaryAction={{
          content: "Publish to AutoTrader",
          loading: atBusy,
          onAction: () => void confirmPublishAutoTrader(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => {
              if (!atBusy) setAtConfirm(null);
            },
          },
        ]}
      >
        <div className="body-md flex flex-col gap-3">
          <p>
            This creates a <strong>real advert</strong> on your AutoTrader
            Connect <strong>sandbox</strong> account for{" "}
            <strong>
              {atConfirm?.vehicle?.registration ?? atConfirm?.title}
            </strong>
            .
          </p>
          <p className="text-(--text-secondary)">
            The advert is created with all advertising locations{" "}
            <strong>NOT_PUBLISHED</strong> (it won&apos;t go live on the
            AutoTrader marketplace until a separate go-live step). The
            returned Stock ID is stored against this listing.
          </p>
          {atConfirm &&
          (atConfirm.vehicle?.imagesCount === 0 ||
            !atConfirm.vehicle?.heroImageUrl) ? (
            <Banner tone="warning">
              This advert will be created without images (photo upload
              pending).
            </Banner>
          ) : null}
        </div>
      </Modal>

      {/* Delete listing confirm — removes the advert, keeps the vehicle. */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        title="Delete this listing?"
        size="small"
        primaryAction={{
          content: "Delete listing",
          destructive: true,
          loading: deleteBusy,
          onAction: () => void confirmDelete(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => {
              if (!deleteBusy) setDeleteTarget(null);
            },
          },
        ]}
      >
        <div className="body-md flex flex-col gap-3">
          <p>
            This permanently deletes the advert for{" "}
            <strong>
              {deleteTarget?.vehicle?.registration ?? deleteTarget?.title}
            </strong>
            {deleteTarget?.status === "live" ? " and takes it offline" : ""}.
            The vehicle and its photos are kept, and it returns to the work
            list as ready to advertise.
          </p>
          {deleteTarget?.atStockId ? (
            <Banner tone="warning">
              This listing is synced to AutoTrader (Stock ID{" "}
              {deleteTarget.atStockId.slice(0, 8)}). Deleting here removes the
              local advert only; remove it on AutoTrader separately.
            </Banner>
          ) : null}
        </div>
      </Modal>
    </Page>
  );
}
