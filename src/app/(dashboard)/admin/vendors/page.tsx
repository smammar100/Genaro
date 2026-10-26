"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Handshake, Store } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { vendorService } from "@/lib/services/vendor-service";
import { dealerPartnerService } from "@/lib/services/dealer-partner-service";
import { maintenanceService } from "@/lib/services/maintenance-service";
import type {
  DealerPartner,
  MaintenanceJob,
  Vendor,
  VendorSpeciality,
} from "@/lib/types";
import {
  ActionMenu,
  Badge,
  Banner,
  Card,
  Checkbox,
  EmptyState,
  IndexTable,
  Modal,
  Page,
  Select,
  SkeletonBodyText,
  SkeletonDisplayText,
  Tabs,
  TextField,
  type BadgeTone,
} from "@/components/genaro";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";

type VendorTab = "garages" | "partners";

const TABS: { id: VendorTab; content: string }[] = [
  { id: "garages", content: "Garages" },
  { id: "partners", content: "Dealer partners" },
];

export default function VendorsPage() {
  const searchParams = useSearchParams();
  // SPEC Point 6 (T6.5) — tab persists in the URL across refresh. The active
  // tab is LOCAL state. We deliberately do NOT use router.replace() to switch
  // it: replacing only the ?tab= query on the same route is unreliable in the
  // App Router (it neither updates useSearchParams nor reliably preserves
  // local state), which froze the controlled tabs when going back to
  // Garages. Instead history.replaceState() reflects the tab into the URL
  // bar with zero React/Next re-render, so local state stays authoritative
  // and the switch is instant in both directions.
  const [tab, setTab] = useState<VendorTab>(() =>
    searchParams.get("tab") === "dealer-partners" ? "partners" : "garages",
  );
  // The "Add" action lives on the page header; each tab opens its own modal.
  const [garageAdd, setGarageAdd] = useState(false);
  const [partnerAdd, setPartnerAdd] = useState(false);
  // "Delete all …" also lives on the header; the tab owns the rows and the
  // confirmation, so the header only asks and learns how many rows there are.
  const [deleteAllRequest, setDeleteAllRequest] = useState(0);
  const [rowCount, setRowCount] = useState(0);

  function selectTab(v: VendorTab) {
    setTab(v);
    setRowCount(0);
    window.history.replaceState(
      null,
      "",
      v === "partners" ? "/admin/vendors?tab=dealer-partners" : "/admin/vendors",
    );
  }

  return (
    <Page
      title="Vendors"
      subtitle="The service garages you send work to and the trade partners who supply your stock."
      fullWidth
      primaryAction={
        tab === "garages"
          ? { content: "Add garage", onAction: () => setGarageAdd(true) }
          : {
              content: "Add dealer partner",
              onAction: () => setPartnerAdd(true),
            }
      }
      secondaryActions={
        rowCount > 0
          ? [
              {
                content:
                  tab === "garages"
                    ? "Delete all garages"
                    : "Delete all dealer partners",
                destructive: true,
                onAction: () => setDeleteAllRequest((n) => n + 1),
              },
            ]
          : undefined
      }
    >
      <Tabs
        tabs={TABS}
        selected={tab === "partners" ? 1 : 0}
        onSelect={(i) => selectTab(TABS[i]?.id ?? "garages")}
      />
      {tab === "garages" ? (
        <GaragesTab
          addOpen={garageAdd}
          setAddOpen={setGarageAdd}
          deleteAllRequest={deleteAllRequest}
          onRowCount={setRowCount}
        />
      ) : (
        <DealerPartnersTab
          addOpen={partnerAdd}
          setAddOpen={setPartnerAdd}
          deleteAllRequest={deleteAllRequest}
          onRowCount={setRowCount}
        />
      )}
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Garages
// ────────────────────────────────────────────────────────────────────────────

const SPECIALITIES: VendorSpeciality[] = [
  "mechanical",
  "electrical",
  "bodywork",
  "tyres",
  "mot",
  "general",
];

const SPECIALITY_LABEL: Record<VendorSpeciality, string> = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  bodywork: "Bodywork",
  tyres: "Tyres",
  mot: "MOT",
  general: "General",
};

const SPECIALITY_TONE: Record<VendorSpeciality, BadgeTone | undefined> = {
  mechanical: "info",
  electrical: "attention",
  bodywork: "info",
  tyres: undefined,
  mot: "success",
  general: undefined,
};

const SPECIALITY_OPTIONS = SPECIALITIES.map((sp) => ({
  label: SPECIALITY_LABEL[sp],
  value: sp,
}));

interface DraftVendor {
  id: string | null;
  name: string;
  phone: string;
  speciality: VendorSpeciality;
  active: boolean;
}

const EMPTY_VENDOR: DraftVendor = {
  id: null,
  name: "",
  phone: "",
  speciality: "mechanical",
  active: true,
};

interface VendorRow extends Vendor {
  activeCount: number;
  totalSpent: number;
}

interface TabProps {
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  /** Goes up by one each time the header's "Delete all …" is pressed. */
  deleteAllRequest: number;
  /** Tells the header how many rows there are (it hides "Delete all" at 0). */
  onRowCount: (n: number) => void;
}

function GaragesTab({
  addOpen,
  setAddOpen,
  deleteAllRequest,
  onRowCount,
}: TabProps) {
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const phoneId = `${baseId}-phone`;
  const specialityId = `${baseId}-speciality`;
  const { company } = useAuth();
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [maintJobs, setMaintJobs] = useState<MaintenanceJob[]>([]);
  const [draft, setDraft] = useState<DraftVendor | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  // The "Add garage" action lives on the page header; open a blank draft
  // when it's pressed.
  const [prevAddOpen, setPrevAddOpen] = useState(false);
  if (addOpen !== prevAddOpen) {
    setPrevAddOpen(addOpen);
    if (addOpen) setDraft({ ...EMPTY_VENDOR });
  }

  // So is "Delete all garages": each press bumps the request, and we confirm
  // every row.
  const [seenDeleteAll, setSeenDeleteAll] = useState(deleteAllRequest);
  if (deleteAllRequest !== seenDeleteAll) {
    setSeenDeleteAll(deleteAllRequest);
    if (vendors?.length) setConfirmIds(vendors.map((v) => v.id));
  }

  const vendorCount = vendors?.length ?? 0;
  useEffect(() => onRowCount(vendorCount), [vendorCount, onRowCount]);

  function closeDraft() {
    setDraft(null);
    setAddOpen(false);
  }

  const load = useCallback(() => {
    if (!company) return;
    void Promise.all([
      vendorService.getAll(company.id),
      maintenanceService.getAll(company.id),
    ])
      .then(([v, m]) => {
        setVendors(v);
        setMaintJobs(m);
      })
      // Without this a failed read leaves the tab on an infinite skeleton;
      // surface a retry instead.
      .catch(() => {
        setVendors(null);
        setLoadError(true);
      });
  }, [company]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo<VendorRow[] | null>(() => {
    if (!vendors) return null;
    const stats = new Map<string, { activeCount: number; totalSpent: number }>();
    for (const v of vendors) stats.set(v.id, { activeCount: 0, totalSpent: 0 });
    for (const j of maintJobs) {
      if (!j.vendorId) continue;
      const sct = stats.get(j.vendorId);
      if (!sct) continue;
      if (j.status !== "completed") sct.activeCount++;
      // "Total spent" is realised cost only: sum actualCost for completed
      // jobs. In-progress estimates aren't money spent and would inflate the
      // figure (and change it when jobs later complete).
      if (j.status === "completed") sct.totalSpent += j.actualCost ?? 0;
    }
    return vendors.map((v) => ({
      ...v,
      activeCount: stats.get(v.id)?.activeCount ?? 0,
      totalSpent: stats.get(v.id)?.totalSpent ?? 0,
    }));
  }, [vendors, maintJobs]);

  const stats = useMemo(() => {
    const activeJobs = rows?.reduce((a, r) => a + r.activeCount, 0) ?? 0;
    const totalSpent = rows?.reduce((a, r) => a + r.totalSpent, 0) ?? 0;
    const specialities = new Set(vendors?.map((v) => v.speciality)).size;
    const activeGarages = vendors?.filter((v) => v.active).length ?? 0;
    return { activeJobs, totalSpent, specialities, activeGarages };
  }, [rows, vendors]);

  async function handleSave() {
    if (!company || !draft) return;
    if (!draft.name.trim()) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    try {
      await vendorService.upsert({
        id: draft.id ?? undefined,
        companyId: company.id,
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        speciality: draft.speciality,
        active: draft.active,
      });
      setVendors(await vendorService.getAll(company.id));
      toast.success(draft.id ? "Garage updated" : "Garage added");
      closeDraft();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ids: string[]) {
    if (!company) return;
    setDeleting(true);
    const blocked: string[] = [];
    let deleted = 0;
    try {
      for (const id of ids) {
        if (await vendorService.remove(id)) deleted++;
        else blocked.push(vendors?.find((v) => v.id === id)?.name ?? "A garage");
      }
    } catch {
      toast.error(
        ids.length === 1
          ? "Couldn't delete the garage. Try again."
          : "Couldn't delete all the garages. Try again.",
      );
    } finally {
      setDeleting(false);
      setConfirmIds(null);
      setVendors(await vendorService.getAll(company.id).catch(() => vendors));
    }
    if (deleted > 0) {
      toast.success(deleted === 1 ? "Garage deleted" : `${deleted} garages deleted`);
    }
    if (blocked.length > 0) {
      toast.error(
        blocked.length === 1
          ? `${blocked[0]} wasn't deleted because jobs, invoices or car moves point to it. Mark it inactive instead.`
          : `${blocked.join(", ")} weren't deleted because jobs, invoices or car moves point to them. Mark them inactive instead.`,
      );
    }
  }

  function editGarage(row: Vendor) {
    setDraft({
      id: row.id,
      name: row.name,
      phone: row.phone,
      speciality: row.speciality,
      active: row.active,
    });
  }

  const confirmName =
    confirmIds?.length === 1
      ? vendors?.find((v) => v.id === confirmIds[0])?.name
      : undefined;
  const confirmCount = confirmIds?.length ?? 0;
  const confirmingAll = confirmCount > 1 && confirmCount === vendorCount;

  return (
    <>
      <KpiStrip
        loading={!vendors}
        tiles={[
          {
            label: "Garages",
            value: vendors ? String(vendors.length) : "—",
            sub: `${stats.activeGarages} active`,
          },
          {
            label: "Active jobs",
            value: String(stats.activeJobs),
            sub: "In progress",
          },
          {
            label: "Total spent",
            value: formatCurrency(stats.totalSpent),
            sub: "All-time",
          },
          {
            label: "Specialities",
            value: String(stats.specialities),
            sub: "Covered",
          },
        ]}
      />

      <Modal
        open={draft !== null}
        onClose={closeDraft}
        title={draft?.id ? "Edit garage" : "Add garage"}
        size="small"
        primaryAction={{
          content: "Save garage",
          loading: saving,
          onAction: () => void handleSave(),
        }}
        secondaryActions={[
          ...(draft?.id
            ? [
                {
                  content: "Delete garage",
                  onAction: () => {
                    setConfirmIds([draft.id as string]);
                    closeDraft();
                  },
                },
              ]
            : []),
          { content: "Cancel", onAction: closeDraft },
        ]}
      >
        {draft && (
          <div className="flex flex-col gap-3">
            <TextField
              id={nameId}
              label="Name"
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
            />
            <TextField
              id={phoneId}
              label="Phone"
              type="tel"
              value={draft.phone}
              onChange={(v) => setDraft({ ...draft, phone: v })}
            />
            <Select
              id={specialityId}
              label="Speciality"
              options={SPECIALITY_OPTIONS}
              value={draft.speciality}
              onChange={(v) =>
                setDraft({ ...draft, speciality: v as VendorSpeciality })
              }
            />
            <Checkbox
              label="Active"
              checked={draft.active}
              onChange={(v) => setDraft({ ...draft, active: v })}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={confirmIds !== null}
        onClose={() => setConfirmIds(null)}
        title={
          confirmName
            ? `Delete ${confirmName}?`
            : `Delete ${confirmingAll ? "all " : ""}${confirmCount} garages?`
        }
        size="small"
        primaryAction={{
          content: confirmCount === 1 ? "Delete garage" : "Delete garages",
          destructive: true,
          loading: deleting,
          onAction: () => void handleDelete(confirmIds ?? []),
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setConfirmIds(null) },
        ]}
      >
        <p className="body-md text-(--text)">
          {confirmName
            ? `${confirmName} comes off your list of garages for good. If jobs, invoices or car moves point to it, it can't be deleted. Mark it inactive instead.`
            : `They come off your list of garages for good. Any that jobs, invoices or car moves point to can't be deleted and will stay. Mark those inactive instead.`}
        </p>
      </Modal>

      {loadError && !rows ? (
        <Banner
          tone="critical"
          action={{
            content: "Retry",
            onAction: () => {
              setLoadError(false);
              load();
            },
          }}
        >
          Couldn&apos;t load garages.
        </Banner>
      ) : !rows ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Store />} heading="No garages yet">
          Add the garages and parts suppliers you work with.
        </EmptyState>
      ) : (
        <IndexTable
          selectable={false}
          onRowClick={(id) => {
            const row = rows.find((r) => r.id === id);
            if (row) editGarage(row);
          }}
          headings={[
            { title: "Name" },
            { title: "Phone" },
            { title: "Speciality" },
            { title: "Active jobs", alignment: "end" },
            { title: "Total spent", alignment: "end" },
            { title: "Actions", alignment: "end" },
          ]}
          rows={rows.map((row) => ({
            id: row.id,
            cells: [
              <NameCell key="name" name={row.name} active={row.active} />,
              <span key="phone" className="text-(--text-secondary)">
                {row.phone || "—"}
              </span>,
              <Badge key="speciality" tone={SPECIALITY_TONE[row.speciality]}>
                {SPECIALITY_LABEL[row.speciality] ?? row.speciality}
              </Badge>,
              <Figure key="jobs" value={row.activeCount} />,
              <Figure
                key="spent"
                value={row.totalSpent}
                format={formatCurrency}
              />,
              <ActionMenu
                key="actions"
                accessibilityLabel={`Actions for ${row.name}`}
                size="micro"
                preferredAlignment="right"
                sections={[
                  {
                    items: [
                      {
                        content: "Edit garage",
                        icon: "EditMinor",
                        onAction: () => editGarage(row),
                      },
                    ],
                  },
                  {
                    items: [
                      {
                        content: "Delete garage",
                        icon: "DeleteMinor",
                        destructive: true,
                        onAction: () => setConfirmIds([row.id]),
                      },
                    ],
                  },
                ]}
              />,
            ],
          }))}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Dealer partners (trade stock suppliers)
// ────────────────────────────────────────────────────────────────────────────

interface DraftPartner {
  id: string | null;
  name: string;
  phone: string;
  companyName: string;
  email: string;
  companyAddress: string;
  vatNumber: string;
  active: boolean;
}

const EMPTY_PARTNER: DraftPartner = {
  id: null,
  name: "",
  phone: "",
  companyName: "",
  email: "",
  companyAddress: "",
  vatNumber: "",
  active: true,
};

interface PartnerRow extends DealerPartner {
  activeStock: number;
}

function DealerPartnersTab({
  addOpen,
  setAddOpen,
  deleteAllRequest,
  onRowCount,
}: TabProps) {
  const baseId = useId();
  const contactNameId = `${baseId}-contact-name`;
  const phoneId = `${baseId}-phone`;
  const emailId = `${baseId}-email`;
  const companyNameId = `${baseId}-company-name`;
  const companyAddressId = `${baseId}-company-address`;
  const vatNumberId = `${baseId}-vat-number`;
  const { company } = useAuth();
  const [partners, setPartners] = useState<DealerPartner[] | null>(null);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [draft, setDraft] = useState<DraftPartner | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  // The "Add dealer partner" action lives on the page header.
  const [prevAddOpen, setPrevAddOpen] = useState(false);
  if (addOpen !== prevAddOpen) {
    setPrevAddOpen(addOpen);
    if (addOpen) setDraft({ ...EMPTY_PARTNER });
  }

  // So does "Delete all dealer partners" (see GaragesTab).
  const [seenDeleteAll, setSeenDeleteAll] = useState(deleteAllRequest);
  if (deleteAllRequest !== seenDeleteAll) {
    setSeenDeleteAll(deleteAllRequest);
    if (partners?.length) setConfirmIds(partners.map((p) => p.id));
  }

  const partnerCount = partners?.length ?? 0;
  useEffect(() => onRowCount(partnerCount), [partnerCount, onRowCount]);

  function editPartner(p: DealerPartner) {
    setDraft({
      id: p.id,
      name: p.name,
      phone: p.phone ?? "",
      companyName: p.companyName ?? "",
      email: p.email ?? "",
      companyAddress: p.companyAddress ?? "",
      vatNumber: p.vatNumber ?? "",
      active: p.active,
    });
  }

  function closeDraft() {
    setDraft(null);
    setAddOpen(false);
  }

  const reload = useCallback(() => {
    if (!company) return Promise.resolve();
    return Promise.all([
      dealerPartnerService.getAll(company.id),
      dealerPartnerService.activeStockCounts(company.id),
    ])
      .then(([p, c]) => {
        setPartners(p);
        setCounts(c);
      })
      .catch(() => {
        setPartners(null);
        setLoadError(true);
      });
  }, [company]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rows = useMemo<PartnerRow[] | null>(() => {
    if (!partners) return null;
    return partners.map((p) => ({
      ...p,
      activeStock: counts.get(p.id) ?? 0,
    }));
  }, [partners, counts]);

  const stats = useMemo(() => {
    const activeStock = rows?.reduce((a, r) => a + r.activeStock, 0) ?? 0;
    const activeCount = partners?.filter((p) => p.active).length ?? 0;
    const companies = new Set(
      partners?.map((p) => p.companyName).filter(Boolean),
    ).size;
    return { activeStock, activeCount, companies };
  }, [rows, partners]);

  async function handleSave() {
    if (!company || !draft) return;
    if (!draft.name.trim()) {
      toast.error("Contact name is required");
      return;
    }
    setSaving(true);
    try {
      const result = await dealerPartnerService.upsert({
        id: draft.id ?? undefined,
        companyId: company.id,
        name: draft.name.trim(),
        phone: draft.phone.trim() || null,
        companyName: draft.companyName.trim() || null,
        email: draft.email.trim() || null,
        companyAddress: draft.companyAddress.trim() || null,
        vatNumber: draft.vatNumber.trim() || null,
        notes: null,
        active: draft.active,
      });
      if (!result) {
        toast.error(
          "Couldn't save: apply migration 0002 (dealer_partners) to the database first.",
        );
        return;
      }
      await reload();
      toast.success(
        draft.id ? "Dealer partner updated" : "Dealer partner added",
      );
      closeDraft();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ids: string[]) {
    setDeleting(true);
    let deleted = 0;
    try {
      for (const id of ids) {
        await dealerPartnerService.remove(id);
        deleted++;
      }
    } catch {
      toast.error(
        ids.length === 1
          ? "Couldn't delete the dealer partner. Try again."
          : "Couldn't delete all the dealer partners. Try again.",
      );
    } finally {
      setDeleting(false);
      setConfirmIds(null);
      await reload();
    }
    if (deleted > 0) {
      toast.success(
        deleted === 1 ? "Dealer partner deleted" : `${deleted} dealer partners deleted`,
      );
    }
  }

  const confirmName =
    confirmIds?.length === 1
      ? (() => {
          const p = partners?.find((x) => x.id === confirmIds[0]);
          return p ? (p.companyName ?? p.name) : undefined;
        })()
      : undefined;
  // Cars in stock that lose their supplier link (sold ones lose it too, but
  // nobody is working those).
  const linkedCars = (confirmIds ?? []).reduce(
    (n, id) => n + (counts.get(id) ?? 0),
    0,
  );
  const confirmCount = confirmIds?.length ?? 0;
  const confirmingAll = confirmCount > 1 && confirmCount === partnerCount;
  const carsLine =
    linkedCars === 0
      ? "Any cars you bought from them stay on record but no longer show a supplier."
      : `The ${linkedCars} ${linkedCars === 1 ? "car" : "cars"} in stock from them stay${linkedCars === 1 ? "s" : ""}, but no longer show${linkedCars === 1 ? "s" : ""} a supplier.`;

  return (
    <>
      <KpiStrip
        loading={!partners}
        tiles={[
          {
            label: "Dealer partners",
            value: partners ? String(partners.length) : "—",
            sub: `${stats.activeCount} active`,
          },
          {
            label: "Active stock",
            value: String(stats.activeStock),
            sub: "Listed",
          },
          {
            label: "Active",
            value: String(stats.activeCount),
            sub: partners ? `Of ${partners.length}` : "—",
          },
          {
            label: "Companies",
            value: String(stats.companies),
            sub: "Linked",
          },
        ]}
      />

      <Modal
        open={draft !== null}
        onClose={closeDraft}
        title={draft?.id ? "Edit dealer partner" : "Add dealer partner"}
        primaryAction={{
          content: "Save dealer partner",
          loading: saving,
          onAction: () => void handleSave(),
        }}
        secondaryActions={[{ content: "Cancel", onAction: closeDraft }]}
      >
        {draft && (
          <div className="flex flex-col gap-3">
            <TextField
              id={contactNameId}
              label="Contact name"
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id={phoneId}
                label="Phone"
                type="tel"
                value={draft.phone}
                onChange={(v) => setDraft({ ...draft, phone: v })}
              />
              <TextField
                id={emailId}
                label="Email"
                type="email"
                value={draft.email}
                onChange={(v) => setDraft({ ...draft, email: v })}
              />
            </div>
            <TextField
              id={companyNameId}
              label="Company name"
              value={draft.companyName}
              onChange={(v) => setDraft({ ...draft, companyName: v })}
            />
            <TextField
              id={companyAddressId}
              label="Company address"
              value={draft.companyAddress}
              onChange={(v) => setDraft({ ...draft, companyAddress: v })}
            />
            <TextField
              id={vatNumberId}
              label="VAT number"
              value={draft.vatNumber}
              onChange={(v) => setDraft({ ...draft, vatNumber: v })}
            />
            <Checkbox
              label="Active"
              checked={draft.active}
              onChange={(v) => setDraft({ ...draft, active: v })}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={confirmIds !== null}
        onClose={() => setConfirmIds(null)}
        title={
          confirmName
            ? `Delete ${confirmName}?`
            : `Delete ${confirmingAll ? "all " : ""}${confirmCount} dealer partners?`
        }
        size="small"
        primaryAction={{
          content:
            confirmCount === 1
              ? "Delete dealer partner"
              : "Delete dealer partners",
          destructive: true,
          loading: deleting,
          onAction: () => void handleDelete(confirmIds ?? []),
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setConfirmIds(null) },
        ]}
      >
        <p className="body-md text-(--text)">
          {confirmName
            ? `${confirmName} comes off your list of dealer partners for good, with their contact details and notes.`
            : "They come off your list of dealer partners for good, with their contact details and notes."}{" "}
          {carsLine} To stop buying from{" "}
          {confirmCount === 1 ? "them" : "any of them"} but keep the record,
          mark {confirmCount === 1 ? "them" : "those"} inactive instead.
        </p>
      </Modal>

      {loadError && !rows ? (
        <Banner
          tone="critical"
          action={{
            content: "Retry",
            onAction: () => {
              setLoadError(false);
              void reload();
            },
          }}
        >
          Couldn&apos;t load dealer partners.
        </Banner>
      ) : !rows ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Handshake />} heading="No dealer partners yet">
          Add the trade partners who supply you stock. (Requires database
          migration 0002.)
        </EmptyState>
      ) : (
        <IndexTable
          selectable={false}
          headings={[
            { title: "Contact" },
            { title: "Phone" },
            { title: "Company" },
            { title: "Active stock", alignment: "end" },
            { title: "Actions", alignment: "end" },
          ]}
          rows={rows.map((row) => ({
            id: row.id,
            url: `/admin/vendors/dealer-partners/${row.id}`,
            cells: [
              <NameCell key="name" name={row.name} active={row.active} />,
              <span key="phone" className="text-(--text-secondary)">
                {row.phone || "—"}
              </span>,
              row.companyName || "—",
              <Figure key="stock" value={row.activeStock} />,
              <ActionMenu
                key="actions"
                accessibilityLabel={`Actions for ${row.name}`}
                size="micro"
                preferredAlignment="right"
                sections={[
                  {
                    items: [
                      {
                        content: "View dealer partner",
                        icon: "ViewMinor",
                        url: `/admin/vendors/dealer-partners/${row.id}`,
                      },
                      {
                        content: "Edit dealer partner",
                        icon: "EditMinor",
                        onAction: () => editPartner(row),
                      },
                    ],
                  },
                  {
                    items: [
                      {
                        content: "Delete dealer partner",
                        icon: "DeleteMinor",
                        destructive: true,
                        onAction: () => setConfirmIds([row.id]),
                      },
                    ],
                  },
                ]}
              />,
            ],
          }))}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────────

interface KpiTile {
  label: string;
  value: string;
  sub: string;
}

/**
 * Four-tile summary — the Genaro stat-tiles pattern: one flush card, tiles
 * split by hairlines, 2 × 2 on narrow screens.
 */
function KpiStrip({ tiles, loading }: { tiles: KpiTile[]; loading: boolean }) {
  return (
    <Card padding="0">
      <div className="grid grid-cols-2 lg:grid-cols-4 [&>*]:border-(--border-secondary) [&>*:nth-child(even)]:border-l [&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(n+2)]:border-l lg:[&>*:nth-child(n+3)]:border-t-0">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col gap-1 p-4">
            <div className="body-sm text-(--text-secondary)">{t.label}</div>
            {loading ? (
              <SkeletonDisplayText size="small" />
            ) : (
              <div className="heading-lg tabular-nums text-(--text)">
                {t.value}
              </div>
            )}
            <div className="body-sm text-(--text-secondary)">{t.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <SkeletonBodyText lines={6} />
    </Card>
  );
}

/** A row's name, flagged only when it's inactive (active is the norm). */
function NameCell({ name, active }: { name: string; active: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {name}
      {active ? null : <Badge>Inactive</Badge>}
    </span>
  );
}

/** A count or amount; nothing yet reads as a dash rather than a column of zeros. */
function Figure({
  value,
  format = String,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  return value === 0 ? (
    <span className="text-(--text-secondary)">—</span>
  ) : (
    <span className="tabular-nums">{format(value)}</span>
  );
}
