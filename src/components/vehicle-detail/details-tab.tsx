"use client";

import { useCallback } from "react";
import { Car, FileText, ShieldCheck, Truck } from "lucide-react";
import type { Vehicle } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { vehicleService } from "@/lib/services/vehicle-service";
import { toast } from "@/lib/toast";
import { describeChanges, type FieldChange } from "@/lib/field-edit";
import {
  nonNegative,
  notFuture,
  required,
  validDate,
  validYear,
  withinRange,
} from "@/lib/field-edit";
import { EditableCard, type EditableField } from "./editable-card";
import { Pill } from "./primitives";
import { variantLabel } from "@/lib/vehicle-variant";
import {
  SALE_STATUS_OPTIONS,
  logBookPatch,
  optionLabel,
} from "@/lib/master-sheet";

interface DetailsTabProps {
  vehicle: Vehicle;
  /** Re-pull the vehicle after a successful save so every tab sees the change. */
  onChanged?: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Builds select options from a string union, title-casing the labels. */
function opts(values: readonly string[]) {
  return values.map((v) => ({
    value: v,
    label: cap(v.replace(/_/g, " ")),
  }));
}

const BODY_TYPES = opts([
  "hatchback",
  "saloon",
  "suv",
  "mpv",
  "estate",
  "convertible",
  "coupe",
]);
const FUEL_TYPES = opts(["petrol", "diesel", "hybrid", "electric"]);
const TRANSMISSIONS = opts(["automatic", "manual"]);
const VEHICLE_TYPES = opts(["car", "van"]);
const PURCHASE_SOURCES = opts([
  "auction",
  "private",
  "trade_in",
  "dealer",
  "other",
]);
const SERVICE_HISTORY = opts(["full", "partial", "none", "unknown"]);
const LOCAL_IMPORT = opts(["local", "import"]);
const SALE_STATUS = SALE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

/**
 * Details tab — the full vehicle spec sheet. Four grouped cards (Identity /
 * Acquisition / Documentation / Registration & Compliance), each editable in
 * place (GEN-99). Compliance statuses render as tone-coded pills so MOT / Tax
 * read at a glance.
 *
 * Every card was render-only until GEN-99: a value mistyped at creation, or
 * imported wrong from a BCA form, could not be corrected anywhere in the app.
 */
export function DetailsTab({ vehicle, onChanged }: DetailsTabProps) {
  const { user } = useAuth();
  const { can, isSuperUser } = usePermissions();
  const canEdit = isSuperUser || can("inventory:edit");

  const save = useCallback(
    async (patch: Partial<Vehicle>, changes: FieldChange[]) => {
      if (!user?.id) {
        toast.error("You must be signed in to edit this vehicle.");
        throw new Error("no actor");
      }
      // A log-book edit carries the V5 flag with it, so the two never disagree.
      const full =
        patch.logBook !== undefined
          ? { ...patch, ...logBookPatch(patch.logBook) }
          : patch;
      try {
        await vehicleService.update(vehicle.id, full, user.id, {
          description: `${vehicle.registration} — ${describeChanges(changes)}`,
          changes,
        });
        toast.success("Vehicle updated");
        onChanged?.();
      } catch (err) {
        // Surface the failure and rethrow so the card stays open with the
        // user's edits intact rather than silently reporting success.
        toast.error("Could not save changes. Please try again.");
        throw err;
      }
    },
    [onChanged, user, vehicle],
  );

  const identity: EditableField<Vehicle>[] = [
    {
      key: "make",
      label: "Make",
      kind: "text",
      validators: [required("Make") as never],
    },
    {
      key: "model",
      label: "Model",
      kind: "text",
      validators: [required("Model") as never],
    },
    {
      key: "variantName",
      label: "Variant",
      kind: "text",
      // GEN-91: show the human-readable variant, never the raw taxonomy code.
      render: (v) => variantLabel(v),
      hint: "Leave blank to fall back to the AutoTrader derivative.",
    },
    {
      key: "year",
      label: "Year",
      kind: "integer",
      plain: true,
      validators: [required("Year") as never, validYear() as never],
    },
    {
      key: "colour",
      label: "Colour",
      kind: "text",
      validators: [required("Colour") as never],
    },
    {
      key: "mileage",
      label: "Mileage",
      kind: "integer",
      suffix: "mi",
      validators: [required("Mileage") as never, nonNegative("Mileage") as never],
    },
    {
      key: "engineSizeCC",
      label: "Engine",
      kind: "integer",
      suffix: "cc",
      validators: [nonNegative("Engine size") as never],
    },
    { key: "vehicleType", label: "Type", kind: "select", options: VEHICLE_TYPES },
    { key: "bodyType", label: "Body", kind: "select", options: BODY_TYPES },
    { key: "fuelType", label: "Fuel", kind: "select", options: FUEL_TYPES },
    {
      key: "transmission",
      label: "Transmission",
      kind: "select",
      options: TRANSMISSIONS,
    },
  ];

  const acquisition: EditableField<Vehicle>[] = [
    { key: "stockId", label: "Stock ID", kind: "text" },
    {
      key: "receivedDate",
      label: "Received",
      kind: "date",
      render: (v) => formatDate(v.receivedDate),
      validators: [
        required("Received date") as never,
        validDate("Received date") as never,
        notFuture("Received date") as never,
      ],
    },
    { key: "sellerName", label: "Seller", kind: "text" },
    { key: "sellerPhone", label: "Seller phone", kind: "text" },
    {
      key: "purchaseSource",
      label: "Purchase source",
      kind: "select",
      options: PURCHASE_SOURCES,
    },
    { key: "auctionHouse", label: "Auction house", kind: "text" },
    {
      key: "serviceHistory",
      label: "Service history",
      kind: "select",
      options: SERVICE_HISTORY,
      render: (v) => cap(v.serviceHistory),
    },
  ];

  // Master sheet columns without a home above (docs/master-sheet-spec.md).
  const buying: EditableField<Vehicle>[] = [
    {
      key: "legacySerialNumber",
      label: "Legacy S/N",
      kind: "integer",
      plain: true,
      hint: "Only for a car from the old Excel sheet. Freezes its value addition.",
    },
    { key: "variantCode", label: "Variant code", kind: "text", hint: "From the BCA invoice." },
    { key: "localOrImport", label: "Local / import", kind: "select", options: LOCAL_IMPORT },
    { key: "ownedBy", label: "Owned by", kind: "text" },
    { key: "ownerDetails", label: "Owner details", kind: "text" },
    {
      key: "invoiceDate",
      label: "Invoice date",
      kind: "date",
      render: (v) => formatDate(v.invoiceDate),
      validators: [validDate("Invoice date") as never],
    },
    {
      key: "creditNoteDate",
      label: "Credit note date",
      kind: "date",
      render: (v) => formatDate(v.creditNoteDate),
      validators: [validDate("Credit note date") as never],
    },
  ];

  const receiving: EditableField<Vehicle>[] = [
    { key: "logBook", label: "Log book", kind: "text", hint: "AVAILABLE also marks the V5 as received." },
    { key: "engineSizeKw", label: "Engine", kind: "integer", suffix: "kW", validators: [nonNegative("Engine size") as never] },
    { key: "numSeats", label: "Seats", kind: "integer", validators: [nonNegative("Seats") as never] },
    { key: "formerKeepers", label: "Former keepers", kind: "integer", validators: [nonNegative("Former keepers") as never] },
    { key: "massInService", label: "Mass in service", kind: "integer", suffix: "kg", validators: [nonNegative("Mass") as never] },
    { key: "engineNumber", label: "Engine no.", kind: "text" },
    { key: "otherItemsReceived", label: "Other items received", kind: "text" },
  ];

  const sales: EditableField<Vehicle>[] = [
    {
      key: "saleStatus",
      label: "Available / sold",
      kind: "select",
      options: SALE_STATUS,
      render: (v) => optionLabel(SALE_STATUS, v.saleStatus) ?? "—",
    },
    {
      key: "dateSold",
      label: "Date sold",
      kind: "date",
      render: (v) => formatDate(v.dateSold),
      validators: [validDate("Date sold") as never],
    },
    { key: "sellingAgent", label: "Selling agent / lead from", kind: "text" },
    {
      key: "financeCompanyDeal",
      label: "Finance company deal",
      kind: "boolean",
      render: (v) =>
        v.financeCompanyDeal === null ? "—" : v.financeCompanyDeal ? "Yes" : "No",
    },
    { key: "remarks", label: "Remarks", kind: "text" },
  ];

  const docs: EditableField<Vehicle>[] = [
    { key: "v5Received", label: "V5 received", kind: "boolean" },
    {
      key: "numKeys",
      label: "Keys",
      kind: "integer",
      validators: [withinRange("Keys", 0, 10) as never],
    },
    {
      key: "lockNut",
      label: "Lock nut",
      kind: "boolean",
      render: (v) => (v.lockNut ? "Present" : "Missing"),
    },
    {
      key: "motExpiry",
      label: "MOT expiry",
      kind: "date",
      render: (v) => formatDate(v.motExpiry),
      validators: [validDate("MOT expiry") as never],
    },
    { key: "vin", label: "VIN / chassis", kind: "text" },
  ];

  const compliance: EditableField<Vehicle>[] = [
    {
      key: "registration",
      label: "Registration",
      kind: "text",
      validators: [required("Registration") as never],
      hint: "Changing this does not re-run the DVLA lookup automatically.",
    },
    {
      key: "motStatus",
      label: "MOT status",
      kind: "text",
      render: (v) =>
        v.motStatus ? (
          <Pill tone={v.motStatus === "Valid" ? "good" : "bad"}>
            {v.motStatus}
          </Pill>
        ) : (
          "—"
        ),
    },
    {
      key: "taxStatus",
      label: "Tax status",
      kind: "text",
      render: (v) =>
        v.taxStatus ? (
          <Pill tone={v.taxStatus === "Taxed" ? "good" : "warn"}>
            {v.taxStatus}
          </Pill>
        ) : (
          "—"
        ),
    },
    {
      key: "taxDueDate",
      label: "Tax due",
      kind: "date",
      render: (v) => formatDate(v.taxDueDate),
      validators: [validDate("Tax due date") as never],
    },
    {
      key: "co2Emissions",
      label: "CO₂ emissions",
      kind: "integer",
      suffix: "g/km",
      validators: [nonNegative("CO₂ emissions") as never],
    },
    { key: "euroStatus", label: "Euro status", kind: "text" },
    { key: "wheelplan", label: "Wheelplan", kind: "text" },
    {
      key: "firstRegisteredDate",
      label: "First registered",
      kind: "date",
      render: (v) => formatDate(v.firstRegisteredDate),
      validators: [
        validDate("First registered") as never,
        notFuture("First registered") as never,
      ],
    },
    {
      key: "dateOfLastV5CIssued",
      label: "Last V5C issued",
      kind: "date",
      render: (v) => formatDate(v.dateOfLastV5CIssued),
      validators: [validDate("Last V5C issued") as never],
    },
  ];

  return (
    <div className="grid gap-4 @2xl:grid-cols-2">
      <EditableCard
        title="Identity"
        icon={Car}
        record={vehicle}
        fields={identity}
        onSave={save}
        canEdit={canEdit}
      />
      <EditableCard
        title="Acquisition"
        icon={Truck}
        record={vehicle}
        fields={acquisition}
        onSave={save}
        canEdit={canEdit}
      />
      <EditableCard
        title="Documentation"
        icon={FileText}
        record={vehicle}
        fields={docs}
        onSave={save}
        canEdit={canEdit}
      />
      <EditableCard
        title="Registration & compliance"
        icon={ShieldCheck}
        record={vehicle}
        fields={compliance}
        onSave={save}
        canEdit={canEdit}
      />
      <EditableCard
        title="Buying (master sheet)"
        icon={Truck}
        record={vehicle}
        fields={buying}
        onSave={save}
        canEdit={canEdit}
      />
      <EditableCard
        title="Receiving (master sheet)"
        icon={FileText}
        record={vehicle}
        fields={receiving}
        onSave={save}
        canEdit={canEdit}
      />
      <EditableCard
        title="Sales data (master sheet)"
        icon={Car}
        record={vehicle}
        fields={sales}
        onSave={save}
        canEdit={canEdit}
      />
    </div>
  );
}
