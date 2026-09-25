"use client";

import {
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/contexts/auth-context";
import { dealerPartnerService } from "@/lib/services/dealer-partner-service";
import type { DealerPartner, Vehicle } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Layout,
  Link,
  Modal,
  Page,
  SkeletonBodyText,
  TextField,
} from "@/components/polaris";
import { AddVehicleModal } from "@/components/vehicles/add-vehicle-modal";
import {
  type ColumnDef,
  DataGridColumnsButton,
  DataGridDensityToggle,
  DataGridHeaderRow,
  DataGridRow,
  DataGridShell,
  DataGridTable,
  VehicleCell,
  useColumnVisibility,
  useDensity,
} from "@/components/data-grid";
import { toast } from "@/lib/toast";

interface DraftPartner {
  name: string;
  phone: string;
  companyName: string;
  email: string;
  companyAddress: string;
  vatNumber: string;
  active: boolean;
}

const BACK_ACTION = {
  content: "Dealer partners",
  url: "/admin/vendors?tab=dealer-partners",
};

export default function DealerPartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { company } = useAuth();
  const [partner, setPartner] = useState<DealerPartner | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<Vehicle[] | null>(null);
  const [historical, setHistorical] = useState<Vehicle[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [edit, setEdit] = useState<DraftPartner | null>(null);
  const [busy, setBusy] = useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const notesId = useId();
  const editIdBase = useId();
  const editNameId = `${editIdBase}-name`;
  const editPhoneId = `${editIdBase}-phone`;
  const editEmailId = `${editIdBase}-email`;
  const editCompanyNameId = `${editIdBase}-company-name`;
  const editCompanyAddressId = `${editIdBase}-company-address`;
  const editVatNumberId = `${editIdBase}-vat-number`;

  const loadStock = useCallback(
    (cid: string) => {
      // .catch guards: without them a failed read leaves the count stuck on
      // "…" forever. Fall back to an empty list so the UI resolves.
      void dealerPartnerService
        .activeStock(cid, id)
        .then(setActive)
        .catch(() => setActive([]));
      void dealerPartnerService
        .historicalStock(cid, id)
        .then(setHistorical)
        .catch(() => setHistorical([]));
    },
    [id],
  );

  useEffect(() => {
    if (!company) return;
    const cid = company.id;
    void dealerPartnerService.getById(id).then((p) => {
      setPartner(p);
      setLoaded(true);
      setNotesDraft(p?.notes ?? "");
      if (p) loadStock(cid);
    });
  }, [company, id, loadStock]);

  // The Add Vehicle flow navigates away to the arrival form, so there's no
  // inline "added" callback to hook. Refetch stock when the tab regains
  // visibility (e.g. the user finishes adding and returns) so a vehicle just
  // sourced from this partner shows up without a manual reload.
  useEffect(() => {
    if (!company) return;
    const cid = company.id;
    const onVisible = () => {
      if (document.visibilityState === "visible" && partner) loadStock(cid);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [company, partner, loadStock]);

  const stockCols = useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        key: "vehicle",
        label: "Vehicle",
        type: "vehicle",
        sticky: true,
        width: 220,
        render: (v) => <VehicleCell vehicle={v} />,
      },
      { key: "registration", label: "Reg", type: "text", width: 110 },
      { key: "stockId", label: "Stock ID", type: "text", width: 110 },
      { key: "status", label: "Status", type: "vehicleStatus", width: 140 },
      { key: "daysInStock", label: "Days", type: "number", width: 80 },
      { key: "listingPrice", label: "Web price", type: "currency", width: 110 },
    ],
    [],
  );

  const { density, setDensity } = useDensity();
  const { hiddenKeys, setHiddenKeys, visibleCols } =
    useColumnVisibility(stockCols);
  const lockedKeys = useMemo(() => new Set(["vehicle"]), []);

  async function saveNotes() {
    if (!company || !partner) return;
    setBusy(true);
    try {
      const res = await dealerPartnerService.upsert({
        id: partner.id,
        companyId: company.id,
        name: partner.name,
        phone: partner.phone,
        companyName: partner.companyName,
        email: partner.email,
        companyAddress: partner.companyAddress,
        vatNumber: partner.vatNumber,
        notes: notesDraft.trim() || null,
        active: partner.active,
      });
      if (res) {
        setPartner(res);
        toast.success("Notes saved");
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!company || !partner || !edit) return;
    if (!edit.name.trim()) {
      toast.error("Contact name is required");
      return;
    }
    setBusy(true);
    try {
      const res = await dealerPartnerService.upsert({
        id: partner.id,
        companyId: company.id,
        name: edit.name.trim(),
        phone: edit.phone.trim() || null,
        companyName: edit.companyName.trim() || null,
        email: edit.email.trim() || null,
        companyAddress: edit.companyAddress.trim() || null,
        vatNumber: edit.vatNumber.trim() || null,
        notes: partner.notes,
        active: edit.active,
      });
      if (res) {
        setPartner(res);
        toast.success("Partner updated");
        setEdit(null);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loaded && !partner) {
    return (
      <Page title="Dealer partner" backAction={BACK_ACTION}>
        <EmptyState heading="Partner not found">
          This dealer partner doesn&apos;t exist or the table isn&apos;t
          migrated.
        </EmptyState>
      </Page>
    );
  }

  if (!partner) {
    return (
      <Page title="Dealer partner" backAction={BACK_ACTION}>
        <Card>
          <SkeletonBodyText lines={4} />
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title={partner.companyName ?? partner.name}
      subtitle={partner.companyName ? partner.name : undefined}
      backAction={BACK_ACTION}
      titleMetadata={
        partner.active ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge>Inactive</Badge>
        )
      }
      secondaryActions={[
        {
          content: "Edit partner",
          onAction: () =>
            setEdit({
              name: partner.name,
              phone: partner.phone ?? "",
              companyName: partner.companyName ?? "",
              email: partner.email ?? "",
              companyAddress: partner.companyAddress ?? "",
              vatNumber: partner.vatNumber ?? "",
              active: partner.active,
            }),
        },
      ]}
      primaryAction={{
        content: "Add vehicle from this partner",
        onAction: () => setAddVehicleOpen(true),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
              <h2 className="heading-sm text-(--text)">
                Active stock{" "}
                <span className="text-(--text-secondary)">
                  ({active?.length ?? "…"})
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <DataGridColumnsButton
                  columns={stockCols}
                  hiddenKeys={hiddenKeys}
                  onChange={setHiddenKeys}
                  lockedKeys={lockedKeys}
                />
                <DataGridDensityToggle
                  density={density}
                  onChange={setDensity}
                />
              </div>
            </div>
            {!active ? (
              <div className="p-4">
                <SkeletonBodyText lines={4} />
              </div>
            ) : active.length === 0 ? (
              <p className="body-md px-4 pb-4 text-(--text-secondary)">
                No vehicles currently in stock from this partner (sold /
                returned excluded).
              </p>
            ) : (
              <StockGrid rows={active} cols={visibleCols} density={density} />
            )}
          </Card>

          <Card padding="0">
            <div className="px-4 pb-2 pt-4">
              <Button
                variant="monochromePlain"
                disclosure={showHistory ? "up" : "down"}
                ariaExpanded={showHistory}
                onClick={() => setShowHistory((s) => !s)}
              >
                {`Historical stock (${historical?.length ?? "…"})`}
              </Button>
            </div>
            {showHistory ? (
              !historical ? (
                <div className="p-4">
                  <SkeletonBodyText lines={3} />
                </div>
              ) : historical.length === 0 ? (
                <p className="body-sm px-4 pb-4 text-(--text-secondary)">
                  No previous vehicles from this partner.
                </p>
              ) : (
                <StockGrid
                  rows={historical}
                  cols={visibleCols}
                  density={density}
                />
              )
            ) : null}
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card title="Partner details">
            <DetailRow label="Contact">{partner.name}</DetailRow>
            <DetailRow label="Phone">{partner.phone || "—"}</DetailRow>
            <DetailRow label="Email">
              {partner.email ? (
                <Link url={`mailto:${partner.email}`}>{partner.email}</Link>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Company address">
              {partner.companyAddress ?? "—"}
            </DetailRow>
            <DetailRow label="VAT number">{partner.vatNumber || "—"}</DetailRow>
          </Card>

          <Card title="Notes">
            <TextField
              id={notesId}
              label="Notes"
              labelHidden
              multiline={4}
              value={notesDraft}
              onChange={setNotesDraft}
              placeholder="Free-text notes about this partner…"
            />
            <div className="flex justify-end">
              <Button
                onClick={() => void saveNotes()}
                loading={busy}
                disabled={busy || notesDraft === (partner.notes ?? "")}
              >
                Save notes
              </Button>
            </div>
          </Card>
        </Layout.Section>
      </Layout>

      <AddVehicleModal
        open={addVehicleOpen}
        onOpenChange={setAddVehicleOpen}
        extraParams={{ dealerPartner: partner.id }}
      />

      <Modal
        open={edit !== null}
        onClose={() => setEdit(null)}
        title="Edit dealer partner"
        primaryAction={{
          content: "Save dealer partner",
          loading: busy,
          onAction: () => void saveEdit(),
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setEdit(null) }]}
      >
        {edit && (
          <div className="flex flex-col gap-3">
            <TextField
              id={editNameId}
              label="Contact name"
              value={edit.name}
              onChange={(v) => setEdit({ ...edit, name: v })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id={editPhoneId}
                label="Phone"
                type="tel"
                value={edit.phone}
                onChange={(v) => setEdit({ ...edit, phone: v })}
              />
              <TextField
                id={editEmailId}
                label="Email"
                type="email"
                value={edit.email}
                onChange={(v) => setEdit({ ...edit, email: v })}
              />
            </div>
            <TextField
              id={editCompanyNameId}
              label="Company name"
              value={edit.companyName}
              onChange={(v) => setEdit({ ...edit, companyName: v })}
            />
            <TextField
              id={editCompanyAddressId}
              label="Company address"
              value={edit.companyAddress}
              onChange={(v) => setEdit({ ...edit, companyAddress: v })}
            />
            <TextField
              id={editVatNumberId}
              label="VAT number"
              value={edit.vatNumber}
              onChange={(v) => setEdit({ ...edit, vatNumber: v })}
            />
            <Checkbox
              label="Active"
              checked={edit.active}
              onChange={(v) => setEdit({ ...edit, active: v })}
            />
          </div>
        )}
      </Modal>
    </Page>
  );
}

/** One label/value pair in the Partner details card. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="body-sm text-(--text-secondary)">{label}</span>
      <span className="body-md break-words text-(--text)">{children}</span>
    </div>
  );
}

/** Stock list in the shared data-grid engine, flush inside its card. */
function StockGrid({
  rows,
  cols,
  density,
}: {
  rows: Vehicle[];
  cols: ColumnDef<Vehicle>[];
  density: ReturnType<typeof useDensity>["density"];
}) {
  return (
    <DataGridShell bare className="border-t border-(--border)">
      <DataGridTable cols={cols} density={density}>
        <DataGridHeaderRow cols={cols} />
        <tbody>
          {rows.map((v, i) => (
            <DataGridRow key={v.id} row={v} cols={cols} index={i} />
          ))}
        </tbody>
      </DataGridTable>
    </DataGridShell>
  );
}
