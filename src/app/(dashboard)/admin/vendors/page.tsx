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
  Avatar,
  Badge,
  Banner,
  Button,
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
} from "@/components/polaris";
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

  function selectTab(v: VendorTab) {
    setTab(v);
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        v === "partners"
          ? "/admin/vendors?tab=dealer-partners"
          : "/admin/vendors",
      );
    }
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
    >
      <Tabs
        tabs={TABS}
        selected={tab === "partners" ? 1 : 0}
        onSelect={(i) => selectTab(TABS[i]?.id ?? "garages")}
      />
      {tab === "garages" ? (
        <GaragesTab addOpen={garageAdd} setAddOpen={setGarageAdd} />
      ) : (
        <DealerPartnersTab addOpen={partnerAdd} setAddOpen={setPartnerAdd} />
      )}
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Garages (the existing vendor list — unchanged behaviour)
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

function GaragesTab({
  addOpen,
  setAddOpen,
}: {
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
}) {
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

  // The "Add garage" action lives on the page header; open the draft here.
  useEffect(() => {
    if (addOpen) setDraft({ ...EMPTY_VENDOR });
  }, [addOpen]);

  function closeDraft() {
    setDraft(null);
    setAddOpen(false);
  }

  const load = useCallback(async () => {
    if (!company) return;
    setLoadError(false);
    try {
      const [v, m] = await Promise.all([
        vendorService.getAll(company.id),
        maintenanceService.getAll(company.id),
      ]);
      setVendors(v);
      setMaintJobs(m);
    } catch {
      // No catch here previously: any failed/slow read left the tab on an
      // infinite skeleton. Surface a retry instead.
      setVendors(null);
      setLoadError(true);
    }
  }, [company]);

  useEffect(() => {
    void load();
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
        secondaryActions={[{ content: "Cancel", onAction: closeDraft }]}
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

      {loadError && !rows ? (
        <Banner
          tone="critical"
          action={{ content: "Retry", onAction: () => void load() }}
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
          headings={[
            { title: "Name" },
            { title: "Phone" },
            { title: "Speciality" },
            { title: "Active jobs", alignment: "end" },
            { title: "Total spent", alignment: "end" },
            { title: "Status" },
          ]}
          rows={rows.map((row) => ({
            id: row.id,
            cells: [
              <Avatar
                key="name"
                name={row.name}
                size="sm"
                label={
                  <Button
                    variant="monochromePlain"
                    onClick={() =>
                      setDraft({
                        id: row.id,
                        name: row.name,
                        phone: row.phone,
                        speciality: row.speciality,
                        active: row.active,
                      })
                    }
                  >
                    {row.name}
                  </Button>
                }
              />,
              <span key="phone" className="text-(--text-secondary)">
                {row.phone || "—"}
              </span>,
              <Badge key="speciality" tone={SPECIALITY_TONE[row.speciality]}>
                {SPECIALITY_LABEL[row.speciality] ?? row.speciality}
              </Badge>,
              <span key="jobs" className="tabular-nums">
                {row.activeCount}
              </span>,
              <span key="spent" className="tabular-nums">
                {formatCurrency(row.totalSpent)}
              </span>,
              <ActiveBadge key="status" active={row.active} />,
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
}: {
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
}) {
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

  // The "Add dealer partner" action lives on the page header.
  useEffect(() => {
    if (addOpen) setDraft({ ...EMPTY_PARTNER });
  }, [addOpen]);

  function closeDraft() {
    setDraft(null);
    setAddOpen(false);
  }

  const reload = useCallback(async () => {
    if (!company) return;
    setLoadError(false);
    try {
      const [p, c] = await Promise.all([
        dealerPartnerService.getAll(company.id),
        dealerPartnerService.activeStockCounts(company.id),
      ]);
      setPartners(p);
      setCounts(c);
    } catch {
      setPartners(null);
      setLoadError(true);
    }
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

      {loadError && !rows ? (
        <Banner
          tone="critical"
          action={{ content: "Retry", onAction: () => void reload() }}
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
            { title: "Status" },
          ]}
          rows={rows.map((row) => ({
            id: row.id,
            url: `/admin/vendors/dealer-partners/${row.id}`,
            cells: [
              row.name,
              <span key="phone" className="text-(--text-secondary)">
                {row.phone || "—"}
              </span>,
              row.companyName || "—",
              <span key="stock" className="tabular-nums">
                {row.activeStock}
              </span>,
              <ActiveBadge key="status" active={row.active} />,
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
 * Four-tile summary — the Polaris stat-tiles pattern: one flush card, tiles
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

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="success">Active</Badge>
  ) : (
    <Badge>Inactive</Badge>
  );
}
