"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { vehicleService } from "@/lib/services/vehicle-service";
import { todoService } from "@/lib/services/todo-service";
import { vendorService } from "@/lib/services/vendor-service";
import { downloadBlob, pdfService } from "@/lib/services/pdf-service";
import { useAuth } from "@/contexts/auth-context";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
} from "@/components/polaris";
import { DaysInStockChip } from "@/components/shared/days-in-stock-chip";
import {
  NEXT_STEP,
  VehicleHeaderCard,
  VehicleStatusMenu,
  VehicleSummaryAside,
  vehicleTitle,
} from "@/components/vehicle-detail/vehicle-header-card";
import { VehicleDetailShell } from "@/components/vehicle-detail/vehicle-detail-shell";
import { titleFromPath } from "@/components/layout/sidebar-config";
import { toast } from "@/lib/toast";

/**
 * Custom labels for routes whose sidebar label would otherwise be ambiguous
 * or absent (e.g. both Sales and Maintenance have a page labelled "Pipeline").
 * Every other route a vehicle can be opened from stamps its own path as
 * `?from=` (see `vehicleDetailHref` in `@/lib/vehicle-nav`) and falls back
 * to `titleFromPath` — the same sidebar-route registry the header title
 * uses — so Back returns to the exact page the user came from instead of
 * always Inventory (GEN-88), even from global search or the command palette.
 */
const BACK_TARGETS: Record<string, string> = {
  "/vehicles": "All vehicles",
  "/sales/pipeline": "Sales pipeline",
  "/maintenance": "Maintenance pipeline",
  "/admin/activity": "Activity log",
  "/advert/photo-processing": "Photo processing",
  "/inventory/add-vehicle": "Add vehicle",
};

/** Resolve the Back link target from the `from` query param. Known routes use
 *  a disambiguated label; any other in-app route falls back to its sidebar
 *  title; anything unrecognised falls back to Inventory. */
function resolveBack(from: string | null): { href: string; label: string } {
  if (from) {
    const path = from.split("?")[0];
    const label = BACK_TARGETS[path] ?? titleFromPath(path);
    if (label && label !== "Car Capital UK") return { href: from, label };
  }
  return { href: "/vehicles", label: "Inventory" };
}

/**
 * Vehicle detail — the Polaris product-detail pattern for a single piece of
 * stock. The Page header carries the back link, title, status (a menu) and
 * days-in-stock badges, the lifecycle's next step as the primary action and
 * Remove from website as a destructive secondary action. Below it,
 * `VehicleHeaderCard` (photo, plate, key facts), then `VehicleDetailShell`:
 * the tab row, and a Layout with the active tab in the main column and the
 * Manage card in the sidebar.
 */
const DETAIL_TABS = new Set([
  "overview",
  "details",
  "location",
  "financials",
  "todo",
  "inspection",
  "photos",
  "listing",
  "appointments",
  "activity",
]);

export default function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const back = resolveBack(searchParams.get("from"));
  const { confirm, confirmDialog } = useConfirm();
  const { user, company } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  // Active detail tab — lifted so the header "Open Inspection" can jump to it.
  // A ?tab= link (e.g. "Edit price" from the vehicle list) opens that tab.
  const [tab, setTab] = useState(() => {
    const requested = searchParams.get("tab");
    return requested && DETAIL_TABS.has(requested) ? requested : "overview";
  });

  useEffect(() => {
    void vehicleService.getById(id).then(setVehicle);
  }, [id]);

  /** Merge fresh fields into the displayed vehicle without a re-fetch — used
   *  by the Overview AutoTrader valuation refresh (the server already
   *  persisted the new values). */
  function patchVehicle(patch: Partial<Vehicle>) {
    setVehicle((v) => (v ? { ...v, ...patch } : v));
  }

  /** Re-pull the vehicle from the service so derived/computed fields the page
   *  doesn't own (imagesCount, heroImageUrl, status, etc.) stay fresh after a
   *  child tab mutates photos / inspection / etc. */
  async function refetchVehicle() {
    const fresh = await vehicleService.getById(id);
    if (fresh) setVehicle(fresh);
  }

  async function handleStatusChange(s: VehicleStatus) {
    if (!user || !vehicle) return;
    try {
      const updated = await vehicleService.changeStatus(vehicle.id, s, user.id);
      setVehicle(updated);
      toast.success(`Status: ${s.replace("_", " ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change status");
    }
  }

  async function handleRemoveFromWebsite() {
    if (!user || !vehicle) return;
    const ok = await confirm({
      title: `Remove ${vehicle.registration} from website?`,
      description:
        "The vehicle disappears from the Work List but stays on the Master Sheet for historical reference.",
      confirmText: "Remove from website",
      destructive: true,
    });
    if (!ok) return;
    try {
      const updated = await vehicleService.removeFromWebsite(vehicle.id, user.id);
      setVehicle(updated);
      toast.success(`${vehicle.registration} removed from website`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove from website");
    }
  }

  async function handleExportPdf() {
    if (!vehicle || !company) return;
    setExporting(true);
    try {
      const [todos, vendors] = await Promise.all([
        todoService.getForVehicle(vehicle.id),
        vendorService.getAll(company.id),
      ]);
      const vendorNames = Object.fromEntries(
        vendors.map((v) => [v.id, v.name]),
      );
      const blob = await pdfService.generateJobCard({
        vehicle,
        todos,
        preparedBy: user?.name ?? "—",
        companyName: company.name,
        vendorNames,
      });
      downloadBlob(blob, `job-card-${vehicle.stockId}.pdf`);
      toast.success("Job card downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setExporting(false);
    }
  }

  if (vehicle === undefined) {
    return (
      <Page>
        <SkeletonDisplayText size="small" />
        <Card>
          <div className="flex gap-4">
            <SkeletonThumbnail size="large" />
            <div className="flex-1">
              <SkeletonBodyText lines={3} />
            </div>
          </div>
        </Card>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonBodyText lines={8} />
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <SkeletonBodyText lines={4} />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  if (vehicle === null) {
    return (
      <Page>
        <EmptyState
          icon="ProductsMinor"
          heading="Vehicle not found"
          action={{ content: `Back to ${back.label}`, url: back.href }}
        >
          It may have been deleted or the link is out of date.
        </EmptyState>
      </Page>
    );
  }

  const nextStep = NEXT_STEP[vehicle.status];
  const canRemoveFromWebsite =
    vehicle.status === "sold" && vehicle.removedFromWebsiteAt === null;

  return (
    <Page
      title={vehicleTitle(vehicle)}
      backAction={{ content: `Back to ${back.label}`, url: back.href }}
      titleMetadata={
        <span className="flex flex-wrap items-center gap-1">
          <VehicleStatusMenu
            vehicle={vehicle}
            onStatusChange={(s) => void handleStatusChange(s)}
          />
          <DaysInStockChip days={vehicle.daysInStock} />
        </span>
      }
      secondaryActions={
        canRemoveFromWebsite
          ? [
              {
                content: "Remove from website",
                destructive: true,
                onAction: () => void handleRemoveFromWebsite(),
              },
            ]
          : undefined
      }
      primaryAction={
        nextStep
          ? { content: nextStep.label, onAction: () => setTab(nextStep.tab) }
          : undefined
      }
    >
      <VehicleHeaderCard vehicle={vehicle} />

      {/* Polaris product detail: the tab row under the header card, then the
          active tab's cards in the main column and the Manage card in the
          one-third sidebar. */}
      <VehicleDetailShell
        vehicle={vehicle}
        value={tab}
        onValueChange={setTab}
        onVehiclePatch={patchVehicle}
        onVehicleRefetch={() => void refetchVehicle()}
        exporting={exporting}
        onExportPdf={() => void handleExportPdf()}
        aside={<VehicleSummaryAside vehicle={vehicle} onNavigate={setTab} />}
        asideClassName="lg:sticky lg:top-4"
      />

      {confirmDialog}
    </Page>
  );
}
