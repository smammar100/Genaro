"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Vehicle } from "@/lib/types";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { todoService } from "@/lib/services/todo-service";
import { enquiryService } from "@/lib/services/enquiry-service";
import { vehiclePhotoService } from "@/lib/services/vehicle-photo-service";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewTab } from "./overview-tab";

// Only the active panel is mounted, and Overview is what the page opens on, so
// the other nine tabs load on first visit instead of in the page's initial JS.
const tabLoading = () => <Skeleton className="h-64 w-full rounded-lg" />;
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

/**
 * v5 vehicle-detail shell — shadcn Tabs (pill style, identical to
 * Admin Invoicing + Sales Appointments) with per-tab panel components.
 * Counts on Things to Do / Photos / Appointments are fetched once on
 * mount so the user sees workload at a glance.
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
  const activeTab = value ?? internalTab;
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
    void vehiclePhotoService
      .list(vehicle.id)
      .then((rows) => setPhotoCount(rows.length))
      .catch(() => setPhotoCount(null));
  }, [vehicle.id]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
      {/* Original grey-pill (`default` variant) but full-width: the
          shadcn TabsTrigger already has `flex-1`, so a `w-full` list
          spreads all 8 tabs to equal widths across the whole content
          area — no stranded pill, no bare gap after "Activity".
          overflow-x-auto keeps it scrollable on narrow viewports. */}
      <TabsList className="max-w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="location">Location</TabsTrigger>
        <TabsTrigger value="financials">Financials</TabsTrigger>
        <TabsTrigger value="todo">
          Things to Do
          <CountBadge value={todoCount} />
        </TabsTrigger>
        <TabsTrigger value="inspection">Inspection</TabsTrigger>
        <TabsTrigger value="photos">
          Photos
          <CountBadge value={photoCount} />
        </TabsTrigger>
        <TabsTrigger value="listing">Listing</TabsTrigger>
        <TabsTrigger value="appointments">
          Appointments
          <CountBadge value={enquiryCount} />
        </TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab
          vehicle={vehicle}
          onVehiclePatch={onVehiclePatch}
          onNavigate={setActiveTab}
          onChanged={onVehicleRefetch}
        />
      </TabsContent>
      <TabsContent value="details">
        <DetailsTab vehicle={vehicle} onChanged={onVehicleRefetch} />
      </TabsContent>
      <TabsContent value="location">
        <LocationTab vehicle={vehicle} />
      </TabsContent>
      <TabsContent value="financials">
        <FinancialsTab vehicle={vehicle} onChanged={onVehicleRefetch} />
      </TabsContent>
      <TabsContent value="todo">
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
                setTodoCount(rows.filter((r) => r.status !== "completed").length),
              )
              .catch(() => undefined);
            onVehicleRefetch?.();
          }}
        />
      </TabsContent>
      <TabsContent value="inspection">
        <InspectionTab vehicle={vehicle} />
      </TabsContent>
      <TabsContent value="photos">
        <PhotosTab vehicle={vehicle} onVehicleRefetch={onVehicleRefetch} />
      </TabsContent>
      <TabsContent value="listing">
        <ListingTab vehicle={vehicle} />
      </TabsContent>
      <TabsContent value="appointments">
        <AppointmentsTab vehicle={vehicle} />
      </TabsContent>
      <TabsContent value="activity">
        <ActivityTab vehicleId={vehicle.id} />
      </TabsContent>
    </Tabs>
  );
}

function CountBadge({ value }: { value: number | null }) {
  if (value == null || value <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-black/[0.06] px-1.5 text-2xs font-medium tabular-nums text-muted-foreground">
      {value}
    </span>
  );
}
