"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Vehicle } from "@/lib/types";
import { Card, Layout, SkeletonBodyText, Tabs } from "@/components/genaro";
import { todoService } from "@/lib/services/todo-service";
import { enquiryService } from "@/lib/services/enquiry-service";
import { vehiclePhotoService } from "@/lib/services/vehicle-photo-service";
import { PHOTOS_ENABLED } from "@/lib/phase-one";
import { OverviewTab } from "./overview-tab";

// Only the active panel is mounted, and Overview is what the page opens on, so
// the other nine tabs load on first visit instead of in the page's initial JS.
const tabLoading = () => (
  <Card>
    <SkeletonBodyText lines={8} />
  </Card>
);
const DetailsTab = dynamic(
  () => import("./details-tab").then((m) => m.DetailsTab),
  { loading: tabLoading },
);
const LocationTab = dynamic(
  () => import("./location-tab").then((m) => m.LocationTab),
  { loading: tabLoading },
);
const FinancialsTab = dynamic(
  () => import("./financials-tab").then((m) => m.FinancialsTab),
  { loading: tabLoading },
);
const TodoTab = dynamic(() => import("./todo-tab").then((m) => m.TodoTab), {
  loading: tabLoading,
});
const InspectionTab = dynamic(
  () => import("./inspection-tab").then((m) => m.InspectionTab),
  { loading: tabLoading },
);
const PhotosTab = dynamic(
  () => import("./photos-tab").then((m) => m.PhotosTab),
  { loading: tabLoading },
);
const ListingTab = dynamic(
  () => import("./listing-tab").then((m) => m.ListingTab),
  { loading: tabLoading },
);
const AppointmentsTab = dynamic(
  () => import("./appointments-tab").then((m) => m.AppointmentsTab),
  { loading: tabLoading },
);
const ActivityTab = dynamic(
  () => import("./activity-tab").then((m) => m.ActivityTab),
  { loading: tabLoading },
);

interface VehicleDetailShellProps {
  vehicle: Vehicle;
  /** Controlled active tab (so the page header can jump to e.g. Inspection). */
  value?: string;
  onValueChange?: (v: string) => void;
  /** Merge fresh fields into the page's Vehicle state (Overview valuation refresh). */
  onVehiclePatch?: (patch: Partial<Vehicle>) => void;
  /** Re-pull the vehicle from the service after a tab mutates photos/inspection
   *  so the header, Photos badge and Overview reflect the change in-session. */
  onVehicleRefetch?: () => void;
  /** Job Card PDF export — surfaced on the Things to Do tab (the job sheet). */
  onExportPdf?: () => void;
  exporting?: boolean;
}

/** The detail tabs, in order. Ids are the values the page and panels use. */
const ALL_TAB_IDS = [
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
] as const;

/** The tabs on show: Photos only while photos are enabled (see phase-one). */
const TAB_IDS = ALL_TAB_IDS.filter((id) => PHOTOS_ENABLED || id !== "photos");

/**
 * Vehicle-detail shell — Genaro Tabs (pill tabs with count badges) spread
 * across their own row, then the active tab's panel at full width. Only the
 * active panel is mounted. Counts on Things
 * to do / Photos / Appointments are fetched once on mount so the user sees
 * workload at a glance.
 */
export function VehicleDetailShell({
  vehicle,
  value,
  onValueChange,
  onVehiclePatch,
  onVehicleRefetch,
  onExportPdf,
  exporting,
}: VehicleDetailShellProps) {
  const [todoCount, setTodoCount] = useState<number | null>(null);
  const [enquiryCount, setEnquiryCount] = useState<number | null>(null);
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  // Uncontrolled fallback when the page doesn't drive the active tab.
  const [internalTab, setInternalTab] = useState("overview");
  const requestedTab = value ?? internalTab;
  // A tab that is not on show (Photos, in Phase 1) opens Overview instead.
  const activeTab = (TAB_IDS as readonly string[]).includes(requestedTab) ? requestedTab : "overview";
  const setActiveTab = onValueChange ?? setInternalTab;

  useEffect(() => {
    void todoService
      .getForVehicle(vehicle.id)
      .then((rows) =>
        setTodoCount(rows.filter((r) => r.status !== "completed").length),
      )
      .catch(() => setTodoCount(null));
    void enquiryService
      .getForVehicle(vehicle.id)
      .then((rows) => setEnquiryCount(rows.length))
      .catch(() => setEnquiryCount(null));
    /**
     * Count the photos that actually exist rather than trusting the stored
     * `imagesCount` column, which has drifted badly — vehicles show a badge of
     * 50+ against zero or one real photo (GEN-106). The Advert page already
     * papers over this with `Math.max(vehicle.imagesCount, photos.count)`.
     */
    if (!PHOTOS_ENABLED) return;
    void vehiclePhotoService
      .list(vehicle.id)
      .then((rows) => setPhotoCount(rows.length))
      .catch(() => setPhotoCount(null));
  }, [vehicle.id]);

  const count = (n: number | null) => (n != null && n > 0 ? n : undefined);
  const selected = Math.max(0, TAB_IDS.indexOf(activeTab as (typeof TAB_IDS)[number]));
  const allTabs = [
    { id: "overview", content: "Overview" },
    { id: "details", content: "Details" },
    { id: "location", content: "Location" },
    { id: "financials", content: "Financials" },
    { id: "todo", content: "Things to do", badge: count(todoCount) },
    { id: "inspection", content: "Inspection" },
    { id: "photos", content: "Photos", badge: count(photoCount) },
    { id: "listing", content: "Listing" },
    {
      id: "appointments",
      content: "Appointments",
      badge: count(enquiryCount),
    },
    { id: "activity", content: "Activity" },
  ];
  // In step with TAB_IDS: Tabs selects by index.
  const tabs = allTabs.filter((t) => (TAB_IDS as readonly string[]).includes(t.id));

  return (
    <>
      {/* Their own row under the header card, the pills sharing its width.
          On a narrow window they keep their size and the row scrolls
          sideways. */}
      <Tabs
        fitted
        tabs={tabs}
        selected={selected}
        onSelect={(i) => setActiveTab(TAB_IDS[i])}
      />

      <Layout>
        <Layout.Section>

          {/* @container: the tab panels size their columns to this panel, not
              the viewport — the nav rail takes part of the window. */}
          <div
            role="tabpanel"
            aria-label={tabs[selected].content}
            className="@container min-w-0"
          >
            {activeTab === "overview" && (
              <OverviewTab
                vehicle={vehicle}
                onVehiclePatch={onVehiclePatch}
                onNavigate={setActiveTab}
                onChanged={onVehicleRefetch}
              />
            )}
            {activeTab === "details" && (
              <DetailsTab vehicle={vehicle} onChanged={onVehicleRefetch} />
            )}
            {activeTab === "location" && <LocationTab vehicle={vehicle} />}
            {activeTab === "financials" && (
              <FinancialsTab vehicle={vehicle} onChanged={onVehicleRefetch} />
            )}
            {activeTab === "todo" && (
              <TodoTab
                vehicleId={vehicle.id}
                onExportPdf={onExportPdf}
                exporting={exporting}
                // Closing the last item can flip the car to "ready" (GEN-64), so the
                // header/status and the tab's own count both need re-pulling.
                onChanged={() => {
                  void todoService
                    .getForVehicle(vehicle.id)
                    .then((rows) =>
                      setTodoCount(
                        rows.filter((r) => r.status !== "completed").length,
                      ),
                    )
                    .catch(() => undefined);
                  onVehicleRefetch?.();
                }}
              />
            )}
            {activeTab === "inspection" && <InspectionTab vehicle={vehicle} />}
            {PHOTOS_ENABLED && activeTab === "photos" && (
              <PhotosTab vehicle={vehicle} onVehicleRefetch={onVehicleRefetch} />
            )}
            {activeTab === "listing" && <ListingTab vehicle={vehicle} />}
            {activeTab === "appointments" && <AppointmentsTab vehicle={vehicle} />}
            {activeTab === "activity" && <ActivityTab vehicleId={vehicle.id} />}
          </div>
        </Layout.Section>
      </Layout>
    </>
  );
}
