"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { vendorService } from "@/lib/services/vendor-service";
import { dealerPartnerService } from "@/lib/services/dealer-partner-service";
import { maintenanceService } from "@/lib/services/maintenance-service";
import type {
  Company,
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
  EmptyStateIllustration,
  IndexTable,
  Modal,
  Page,
  Select,
  SkeletonBodyText,
  Tabs,
  TextField,
  type BadgeTone,
  type IndexTableHeading,
  type PageSecondaryAction,
} from "@/components/genaro";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";

/* Garages and dealer partners share one list (decided from /proto/vendors,
   docs/vendors.md): a filter and a search on top, and the columns each kind
   had on its own tab. */

type Filter = "all" | "garages" | "partners";

const FILTERS: { id: Filter; content: string }[] = [
  { id: "all", content: "All" },
  { id: "garages", content: "Garages" },
  { id: "partners", content: "Dealer partners" },
];

const FILTER_URL: Record<Filter, string> = {
  all: "/admin/vendors",
  garages: "/admin/vendors?tab=garages",
  partners: "/admin/vendors?tab=dealer-partners",
};

function filterFromParam(tab: string | null): Filter {
  if (tab === "dealer-partners") return "partners";
  if (tab === "garages") return "garages";
  return "all";
}

type Column =
  | "name"
  | "phone"
  | "speciality"
  | "company"
  | "jobs"
  | "stock"
  | "spent"
  | "actions";

/** Each filter keeps the columns its tab had; All shows both sets. */
const COLUMNS: Record<Filter, Column[]> = {
  all: ["name", "phone", "speciality", "company", "jobs", "stock", "spent", "actions"],
  garages: ["name", "phone", "speciality", "jobs", "spent", "actions"],
  partners: ["name", "phone", "company", "stock", "actions"],
};

const HEADING: Record<Column, IndexTableHeading> = {
  name: { title: "Name" },
  phone: { title: "Phone" },
  speciality: { title: "Speciality" },
  company: { title: "Company" },
  jobs: { title: "Active jobs", alignment: "end" },
  stock: { title: "Active stock", alignment: "end" },
  spent: { title: "Total spent", alignment: "end" },
  actions: { title: "Actions", alignment: "end" },
};

const partnerUrl = (id: string) => `/admin/vendors/dealer-partners/${id}`;

type Row =
  | { kind: "garage"; id: string; name: string; garage: VendorRow }
  | { kind: "partner"; id: string; name: string; partner: PartnerRow };

function searchText(r: Row): string {
  return (
    r.kind === "garage"
      ? `${r.name} ${r.garage.phone} ${SPECIALITY_LABEL[r.garage.speciality]}`
      : `${r.name} ${r.partner.phone ?? ""} ${r.partner.companyName ?? ""}`
  ).toLowerCase();
}

export default function VendorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { company } = useAuth();
  // SPEC Point 6 (T6.5): the filter persists in the URL across refresh. It is
  // LOCAL state, reflected into the URL with history.replaceState() rather
  // than router.replace(): replacing only the ?tab= query on the same route is
  // unreliable in the App Router (it neither updates useSearchParams nor
  // reliably keeps local state), which once froze the tabs. replaceState()
  // updates the address bar with no React/Next re-render, so the switch is
  // instant both ways.
  const [filter, setFilter] = useState<Filter>(() =>
    filterFromParam(searchParams.get("tab")),
  );
  const [query, setQuery] = useState("");
  const garages = useGarages(company);
  const partners = usePartners(company);
  const [garageDraft, setGarageDraft] = useState<DraftVendor | null>(null);
  const [garageConfirm, setGarageConfirm] = useState<string[] | null>(null);
  const [partnerDraft, setPartnerDraft] = useState<DraftPartner | null>(null);
  const [partnerConfirm, setPartnerConfirm] = useState<string[] | null>(null);

  function selectFilter(f: Filter) {
    setFilter(f);
    window.history.replaceState(null, "", FILTER_URL[f]);
  }

  const wantGarages = filter !== "partners";
  const wantPartners = filter !== "garages";
  const loading =
    (wantGarages && !garages.rows && !garages.error) ||
    (wantPartners && !partners.rows && !partners.error);
  const loaded = (wantGarages && garages.rows) || (wantPartners && partners.rows);
  const nothingYet = garages.rows?.length === 0 && partners.rows?.length === 0;
  const searching = query.trim() !== "";

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const list: Row[] = [
      ...(wantGarages ? (garages.rows ?? []) : []).map((g) => ({
        kind: "garage" as const,
        id: `garage-${g.id}`,
        name: g.name,
        garage: g,
      })),
      ...(wantPartners ? (partners.rows ?? []) : []).map((p) => ({
        kind: "partner" as const,
        id: `partner-${p.id}`,
        name: p.name,
        partner: p,
      })),
    ];
    return list
      .filter((r) => !q || searchText(r).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [garages.rows, partners.rows, wantGarages, wantPartners, query]);

  function count(f: Filter): number | undefined {
    if (f === "garages") return garages.rows?.length;
    if (f === "partners") return partners.rows?.length;
    return garages.rows && partners.rows
      ? garages.rows.length + partners.rows.length
      : undefined;
  }

  function addGarage() {
    setGarageDraft({ ...EMPTY_VENDOR });
  }
  function addPartner() {
    setPartnerDraft({ ...EMPTY_PARTNER });
  }
  function editGarage(v: Vendor) {
    setGarageDraft({
      id: v.id,
      name: v.name,
      phone: v.phone,
      speciality: v.speciality,
      active: v.active,
    });
  }
  function editPartner(p: DealerPartner) {
    setPartnerDraft({
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

  // The primary follows the filter; on All the other kind's Add sits beside
  // it. "Delete all" shows on its own filter only, so a bulk delete is always
  // scoped to one kind.
  const primaryAction =
    filter === "partners"
      ? { content: "Add dealer partner", onAction: addPartner }
      : { content: "Add garage", onAction: addGarage };
  let secondaryActions: PageSecondaryAction[] | undefined;
  if (filter === "all") {
    secondaryActions = [{ content: "Add dealer partner", onAction: addPartner }];
  } else if (filter === "garages" && garages.rows?.length) {
    const ids = garages.rows.map((r) => r.id);
    secondaryActions = [
      { content: "Delete all garages", destructive: true, onAction: () => setGarageConfirm(ids) },
    ];
  } else if (filter === "partners" && partners.rows?.length) {
    const ids = partners.rows.map((r) => r.id);
    secondaryActions = [
      { content: "Delete all dealer partners", destructive: true, onAction: () => setPartnerConfirm(ids) },
    ];
  }

  // "—" means no value yet; a column that belongs to the other kind stays blank.
  const dash = <span className="text-(--text-secondary)">—</span>;

  function cell(r: Row, c: Column): React.ReactNode {
    if (c === "name") {
      const active = r.kind === "garage" ? r.garage.active : r.partner.active;
      return <NameCell name={r.name} active={active} />;
    }
    if (c === "phone") {
      const phone = r.kind === "garage" ? r.garage.phone : r.partner.phone;
      return <span className="text-(--text-secondary)">{phone || "—"}</span>;
    }
    if (r.kind === "garage") {
      const g = r.garage;
      switch (c) {
        case "speciality":
          return (
            <Badge tone={SPECIALITY_TONE[g.speciality]}>
              {SPECIALITY_LABEL[g.speciality] ?? g.speciality}
            </Badge>
          );
        case "jobs":
          return <Figure value={g.activeCount} />;
        case "spent":
          return <Figure value={g.totalSpent} format={formatCurrency} />;
        case "actions":
          return (
            <ActionMenu
              accessibilityLabel={`Actions for ${g.name}`}
              size="micro"
              preferredAlignment="right"
              sections={[
                {
                  items: [
                    { content: "Edit garage", icon: "EditMinor", onAction: () => editGarage(g) },
                  ],
                },
                {
                  items: [
                    {
                      content: "Delete garage",
                      icon: "DeleteMinor",
                      destructive: true,
                      onAction: () => setGarageConfirm([g.id]),
                    },
                  ],
                },
              ]}
            />
          );
        default:
          return null; // Company and Active stock are a partner's, not a garage's.
      }
    }
    const p = r.partner;
    switch (c) {
      case "company":
        return p.companyName || dash;
      case "stock":
        return <Figure value={p.activeStock} />;
      case "actions":
        return (
          <ActionMenu
            accessibilityLabel={`Actions for ${p.name}`}
            size="micro"
            preferredAlignment="right"
            sections={[
              {
                items: [
                  { content: "View dealer partner", icon: "ViewMinor", url: partnerUrl(p.id) },
                  { content: "Edit dealer partner", icon: "EditMinor", onAction: () => editPartner(p) },
                ],
              },
              {
                items: [
                  {
                    content: "Delete dealer partner",
                    icon: "DeleteMinor",
                    destructive: true,
                    onAction: () => setPartnerConfirm([p.id]),
                  },
                ],
              },
            ]}
          />
        );
      default:
        return null; // Speciality, Active jobs and Total spent are a garage's.
    }
  }

  const columns = COLUMNS[filter];
  const headings = columns.map((c) =>
    c === "name" && filter === "partners" ? { title: "Contact" } : HEADING[c],
  );

  let body: React.ReactNode;
  if (rows.length === 0 && searching) {
    body = (
      <EmptyState
        compact
        illustration={<EmptyStateIllustration variant="search" />}
        heading="Nobody matches"
        secondaryAction={{ content: "Clear search", onAction: () => setQuery("") }}
      >
        Try part of the name, the number, the company or a speciality such as
        Tyres.
      </EmptyState>
    );
  } else if (rows.length === 0) {
    body =
      filter === "partners" ? (
        <EmptyState compact illustration={<EmptyStateIllustration variant="list" />} heading="No dealer partners yet">
          Add the trade partners who supply you stock. (Requires database
          migration 0002.)
        </EmptyState>
      ) : (
        <EmptyState compact illustration={<EmptyStateIllustration variant="list" />} heading="No garages yet">
          Add the garages and parts suppliers you work with.
        </EmptyState>
      );
  } else {
    body = (
      <IndexTable
        className="rounded-none shadow-none"
        selectable={false}
        onRowClick={(id) => {
          const r = rows.find((x) => x.id === id);
          if (r?.kind === "garage") editGarage(r.garage);
          else if (r) router.push(partnerUrl(r.partner.id));
        }}
        headings={headings}
        rows={rows.map((r) => ({
          id: r.id,
          url: r.kind === "partner" ? partnerUrl(r.partner.id) : undefined,
          cells: columns.map((c) => cell(r, c)),
        }))}
      />
    );
  }

  return (
    <Page
      title="Vendors"
      subtitle="The service garages you send work to and the trade partners who supply your stock."
      fullWidth
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
    >
      {wantGarages && garages.error ? (
        <Banner tone="critical" action={{ content: "Retry", onAction: garages.retry }}>
          Couldn&apos;t load garages.
        </Banner>
      ) : null}
      {wantPartners && partners.error ? (
        <Banner tone="critical" action={{ content: "Retry", onAction: partners.retry }}>
          Couldn&apos;t load dealer partners.
        </Banner>
      ) : null}

      {loading ? (
        <Card>
          <SkeletonBodyText lines={6} />
        </Card>
      ) : nothingYet ? (
        <Card>
          <EmptyState illustration={<EmptyStateIllustration variant="list" />} heading="No vendors yet">
            Add the garages you send work to and the trade partners who supply
            your stock.
          </EmptyState>
        </Card>
      ) : loaded ? (
        <Card padding="0">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2">
            <Tabs
              tabs={FILTERS.map((f) => ({ id: f.id, content: f.content, badge: count(f.id) }))}
              selected={FILTERS.findIndex((f) => f.id === filter)}
              onSelect={(i) => selectFilter(FILTERS[i]?.id ?? "all")}
            />
            <div className="w-full sm:w-72">
              <TextField
                label="Search vendors"
                labelHidden
                prefix="SearchMinor"
                placeholder="Search name, company or speciality"
                value={query}
                onChange={setQuery}
                clearButton
                onClearButtonClick={() => setQuery("")}
              />
            </div>
          </div>
          {body}
        </Card>
      ) : null}

      <GarageDialogs
        garages={garages}
        draft={garageDraft}
        setDraft={setGarageDraft}
        confirmIds={garageConfirm}
        setConfirmIds={setGarageConfirm}
      />
      <PartnerDialogs
        partners={partners}
        draft={partnerDraft}
        setDraft={setPartnerDraft}
        confirmIds={partnerConfirm}
        setConfirmIds={setPartnerConfirm}
      />
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

/** The garages, each with its open jobs and what has been spent with it. */
function useGarages(company: Company | null) {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!company) return;
    void Promise.all([
      vendorService.getAll(company.id),
      maintenanceService.getAll(company.id),
    ])
      .then(([v, m]) => {
        setVendors(v);
        setJobs(m);
      })
      // Without this a failed read leaves the list on an endless skeleton;
      // surface a retry instead.
      .catch(() => {
        setVendors(null);
        setError(true);
      });
  }, [company]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo<VendorRow[] | null>(() => {
    if (!vendors) return null;
    const stats = new Map<string, { activeCount: number; totalSpent: number }>();
    for (const v of vendors) stats.set(v.id, { activeCount: 0, totalSpent: 0 });
    for (const j of jobs) {
      if (!j.vendorId) continue;
      const s = stats.get(j.vendorId);
      if (!s) continue;
      if (j.status !== "completed") s.activeCount++;
      // "Total spent" is realised cost only: actualCost on completed jobs.
      // In-progress estimates aren't money spent and would inflate the
      // figure (and change it when the jobs complete).
      if (j.status === "completed") s.totalSpent += j.actualCost ?? 0;
    }
    return vendors.map((v) => ({
      ...v,
      activeCount: stats.get(v.id)?.activeCount ?? 0,
      totalSpent: stats.get(v.id)?.totalSpent ?? 0,
    }));
  }, [vendors, jobs]);

  return {
    vendors,
    rows,
    error,
    retry() {
      setError(false);
      load();
    },
    /** Re-reads the garages after a change (their jobs don't move). */
    async refresh() {
      if (!company) return;
      const v = await vendorService.getAll(company.id).catch(() => null);
      if (v) setVendors(v);
    },
  };
}

interface DialogProps<Draft> {
  draft: Draft | null;
  setDraft: (d: Draft | null) => void;
  confirmIds: string[] | null;
  setConfirmIds: (ids: string[] | null) => void;
}

function GarageDialogs({
  garages,
  draft,
  setDraft,
  confirmIds,
  setConfirmIds,
}: DialogProps<DraftVendor> & { garages: ReturnType<typeof useGarages> }) {
  const baseId = useId();
  const { company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const vendors = garages.vendors;

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
      await garages.refresh();
      toast.success(draft.id ? "Garage updated" : "Garage added");
      setDraft(null);
    } catch {
      toast.error("Couldn't save the garage. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ids: string[]) {
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
      await garages.refresh();
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

  const confirmName =
    confirmIds?.length === 1
      ? vendors?.find((v) => v.id === confirmIds[0])?.name
      : undefined;
  const confirmCount = confirmIds?.length ?? 0;
  const confirmingAll = confirmCount > 1 && confirmCount === (vendors?.length ?? 0);

  return (
    <>
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
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
                    setDraft(null);
                  },
                },
              ]
            : []),
          { content: "Cancel", onAction: () => setDraft(null) },
        ]}
      >
        {draft && (
          <div className="flex flex-col gap-3">
            <TextField
              id={`${baseId}-name`}
              label="Name"
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
            />
            <TextField
              id={`${baseId}-phone`}
              label="Phone"
              type="tel"
              value={draft.phone}
              onChange={(v) => setDraft({ ...draft, phone: v })}
            />
            <Select
              id={`${baseId}-speciality`}
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

/** The dealer partners, each with how many of their cars are in stock. */
function usePartners(company: Company | null) {
  const [partners, setPartners] = useState<DealerPartner[] | null>(null);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState(false);

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
        setError(true);
      });
  }, [company]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rows = useMemo<PartnerRow[] | null>(() => {
    if (!partners) return null;
    return partners.map((p) => ({ ...p, activeStock: counts.get(p.id) ?? 0 }));
  }, [partners, counts]);

  return {
    partners,
    counts,
    rows,
    error,
    reload,
    retry() {
      setError(false);
      void reload();
    },
  };
}

function PartnerDialogs({
  partners: data,
  draft,
  setDraft,
  confirmIds,
  setConfirmIds,
}: DialogProps<DraftPartner> & { partners: ReturnType<typeof usePartners> }) {
  const baseId = useId();
  const { company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { partners, counts } = data;

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
      await data.reload();
      toast.success(draft.id ? "Dealer partner updated" : "Dealer partner added");
      setDraft(null);
    } catch {
      toast.error("Couldn't save the dealer partner. Try again.");
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
      await data.reload();
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
  const confirmingAll = confirmCount > 1 && confirmCount === (partners?.length ?? 0);
  const carsLine =
    linkedCars === 0
      ? "Any cars you bought from them stay on record but no longer show a supplier."
      : `The ${linkedCars} ${linkedCars === 1 ? "car" : "cars"} in stock from them stay${linkedCars === 1 ? "s" : ""}, but no longer show${linkedCars === 1 ? "s" : ""} a supplier.`;

  return (
    <>
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit dealer partner" : "Add dealer partner"}
        primaryAction={{
          content: "Save dealer partner",
          loading: saving,
          onAction: () => void handleSave(),
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setDraft(null) }]}
      >
        {draft && (
          <div className="flex flex-col gap-3">
            <TextField
              id={`${baseId}-contact-name`}
              label="Contact name"
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id={`${baseId}-phone`}
                label="Phone"
                type="tel"
                value={draft.phone}
                onChange={(v) => setDraft({ ...draft, phone: v })}
              />
              <TextField
                id={`${baseId}-email`}
                label="Email"
                type="email"
                value={draft.email}
                onChange={(v) => setDraft({ ...draft, email: v })}
              />
            </div>
            <TextField
              id={`${baseId}-company-name`}
              label="Company name"
              value={draft.companyName}
              onChange={(v) => setDraft({ ...draft, companyName: v })}
            />
            <TextField
              id={`${baseId}-company-address`}
              label="Company address"
              value={draft.companyAddress}
              onChange={(v) => setDraft({ ...draft, companyAddress: v })}
            />
            <TextField
              id={`${baseId}-vat-number`}
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
            confirmCount === 1 ? "Delete dealer partner" : "Delete dealer partners",
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
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────────

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
