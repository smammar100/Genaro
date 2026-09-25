"use client";

import { useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import {
  Button,
  Card,
  DropZone,
  Icon,
  Layout,
  Page,
  PageActions,
  Select,
  Tabs,
  Thumbnail,
  TextField,
  type SelectOption,
} from "@/components/polaris";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  companyService,
  type LogoKind,
} from "@/lib/services/company-service";
import { PipelineStageSettings } from "@/components/admin/pipeline-stage-settings";
import { InspectionChecklistSettings } from "@/components/admin/inspection-checklist-settings";
import { LeadChannelSettings } from "@/components/admin/lead-channel-settings";
import { BackupPanel } from "@/components/settings/backup-panel";
import { toast } from "@/lib/toast";
import { authService } from "@/lib/services/auth-service";
import { accountHandle } from "@/lib/auth/username";

/** Quarter-hour steps for the working-hours pickers ("00:00" … "23:45"). */
const QUARTER_HOURS: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

/** Time options, keeping a stored off-grid value (e.g. "08:40") selectable. */
function timeOptions(current: string): SelectOption[] {
  const values = QUARTER_HOURS.includes(current) || !current
    ? QUARTER_HOURS
    : [...QUARTER_HOURS, current].sort();
  return values.map((v) => ({ label: v, value: v }));
}

/** Settings sections in tab order. All but My profile need Manage Settings. */
const SECTIONS = [
  { id: "profile", content: "My profile" },
  { id: "company", content: "Company" },
  { id: "inspection", content: "Inspection checklist" },
  { id: "pipeline", content: "Sales pipeline" },
  { id: "channels", content: "Lead channels" },
  { id: "backup", content: "Backup" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function SettingsPage() {
  const { user, company, revalidate } = useAuth();
  const { can, isSuperUser, isLoading } = usePermissions();
  const canManage = isSuperUser || can("admin:manage_settings");
  // My profile is open to everyone; the company tabs need Manage Settings.
  // Until permissions load, show just the profile.
  const manageTabs = canManage && !isLoading;
  const tabs = manageTabs ? SECTIONS : SECTIONS.slice(0, 1);
  // The tab the user picked, tagged with the permission state it was picked
  // under: once permissions settle the pick resets, so a manager lands on
  // Company and everyone else on My profile.
  const [picked, setPicked] = useState<{ manage: boolean; id: SectionId } | null>(
    null,
  );
  const active: SectionId =
    picked && picked.manage === manageTabs
      ? picked.id
      : manageTabs
        ? "company"
        : "profile";
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === active),
  );
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(company?.name ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [vat, setVat] = useState(company?.vatNumber ?? "");
  const [stockPrefix, setStockPrefix] = useState(company?.stockIdPrefix ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(
    company?.logoUrl ?? null,
  );
  const [logoMarkUrl, setLogoMarkUrl] = useState<string | null>(
    company?.logoMarkUrl ?? null,
  );
  const [hoursStart, setHoursStart] = useState(
    company?.workingHoursStart ?? "09:00",
  );
  const [hoursEnd, setHoursEnd] = useState(
    company?.workingHoursEnd ?? "18:00",
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingMark, setUploadingMark] = useState(false);

  async function handleLogoSelect(file: File | undefined, kind: LogoKind) {
    if (!file || !company) return;
    const setUploading = kind === "mark" ? setUploadingMark : setUploadingLogo;
    const setUrl = kind === "mark" ? setLogoMarkUrl : setLogoUrl;
    setUploading(true);
    try {
      const url = await companyService.uploadLogo(file, company.id, kind);
      setUrl(url);
      toast.success("Uploaded, click Save to apply it");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!user || !company) return;
    if (hoursEnd <= hoursStart) {
      toast.error("Working hours end must be after the start time");
      return;
    }
    setSaving(true);
    try {
      await companyService.update(
        company.id,
        {
          name,
          address,
          vatNumber: vat,
          stockIdPrefix: stockPrefix,
          logoUrl: logoUrl ?? "",
          logoMarkUrl: logoMarkUrl ?? "",
          workingHoursStart: hoursStart,
          workingHoursEnd: hoursEnd,
        },
        user.id,
      );
      // Refresh the auth-context company so the sidebar mark + invoice logo
      // pick up the change without a full reload.
      await revalidate({ force: true });
      toast.success("Company settings saved");
    } catch (err) {
      console.error("[settings] save failed:", err);
      toast.error("Couldn't save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page
      title="Settings"
      subtitle={`Your profile${canManage ? ", plus your company details, inspection checklist, sales pipeline, lead channels and backups" : ""}.`}
    >
      {/* Section tabs sit under the header, Shopify-style, and scroll
          sideways on a narrow screen rather than wrapping. */}
      <Tabs
        tabs={[...tabs]}
        selected={selectedIndex}
        onSelect={(i) =>
          setPicked({ manage: manageTabs, id: tabs[i]?.id ?? "profile" })
        }
      />
      <div
        role="tabpanel"
        aria-label={tabs[selectedIndex]?.content}
        className="w-full min-w-0"
      >
        {active === "profile" && <ProfilePanel />}
        {manageTabs && (
          <>
            {active === "company" && (
              <Layout>
                <Layout.AnnotatedSection
                  title="Branding"
                  description="Logos used on invoices and in the top bar."
                >
                  <Card padding="0">
                    <div className="divide-y divide-(--border-secondary)">
                      <LogoField
                        label="Full logo"
                        hint="Logo and wordmark on generated invoices."
                        url={logoUrl}
                        uploading={uploadingLogo}
                        onSelect={(file) => void handleLogoSelect(file, "full")}
                        onClear={() => setLogoUrl(null)}
                      />
                      <LogoField
                        label="Logo mark"
                        hint="Square icon in the top bar. Your initials show when it's empty."
                        url={logoMarkUrl}
                        uploading={uploadingMark}
                        onSelect={(file) => void handleLogoSelect(file, "mark")}
                        onClear={() => setLogoMarkUrl(null)}
                      />
                    </div>
                  </Card>
                </Layout.AnnotatedSection>
                <Layout.AnnotatedSection
                  title="Company details"
                  description="Name, address and tax details shown on invoices."
                >
                  <Card>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <TextField
                          label="Name"
                          value={name}
                          onChange={setName}
                          autoComplete="organization"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <TextField
                          label="Address"
                          value={address}
                          onChange={setAddress}
                          autoComplete="street-address"
                        />
                      </div>
                      <TextField label="VAT number" value={vat} onChange={setVat} />
                      <TextField
                        label="Stock ID prefix"
                        value={stockPrefix}
                        onChange={setStockPrefix}
                        maxLength={4}
                        helpText="Up to 4 characters."
                      />
                    </div>
                  </Card>
                </Layout.AnnotatedSection>
                <Layout.AnnotatedSection
                  title="Working hours"
                  description="Controls the Appointment Book calendar range."
                >
                  <Card>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Select
                        label="Working hours start"
                        options={timeOptions(hoursStart)}
                        value={hoursStart}
                        onChange={setHoursStart}
                        helpText="Drives the visible range on the Appointment Book calendar."
                      />
                      <Select
                        label="Working hours end"
                        options={timeOptions(hoursEnd)}
                        value={hoursEnd}
                        onChange={setHoursEnd}
                        helpText="Appointments can be booked up to one hour before this time."
                      />
                    </div>
                  </Card>
                </Layout.AnnotatedSection>
                <Layout.Section>
                  <PageActions
                    primaryAction={{
                      content: "Save",
                      onAction: () => void handleSave(),
                      loading: saving,
                    }}
                  />
                </Layout.Section>
              </Layout>
            )}
            {active === "inspection" && <InspectionChecklistSettings />}
            {active === "pipeline" && <PipelineStageSettings />}
            {active === "channels" && <LeadChannelSettings />}
            {active === "backup" && <BackupPanel />}
          </>
        )}
      </div>
    </Page>
  );
}

/**
 * Settings → My profile. Every user can change the name shown on their card,
 * in the header and in the activity log. Email / username stay as they are:
 * they are the sign-in identity, managed from Users & Permissions.
 */
function ProfilePanel() {
  const { user, revalidate } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();
  const unchanged = trimmed === (user?.name ?? "");

  async function save() {
    if (!user || !trimmed || unchanged) return;
    setSaving(true);
    try {
      await authService.updateOwnName(user.id, trimmed);
      await revalidate({ force: true });
      toast.success("Name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update your name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <Layout.AnnotatedSection
        title="My profile"
        description="How you appear to your team."
      >
        <Card>
          <div className="flex flex-col gap-4">
            {/* Enter saves: TextField has no key handler, so listen on the wrapper. */}
            <div
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
              }}
            >
              <TextField
                label="Your name"
                value={name}
                maxLength={80}
                autoComplete="name"
                onChange={setName}
                helpText="Shown on your card, in the header and against everything you do in the activity log."
                error={!trimmed ? "Name can't be empty" : undefined}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-(--text)">Sign-in</span>
              <div className="flex items-center gap-3 rounded-(--radius-200) bg-(--bg-surface-secondary) px-3 py-2">
                <Icon source={<KeyRound className="size-4" />} tone="subdued" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-(--text)">
                    {user ? accountHandle(user) : "—"}
                  </div>
                  <div className="text-xs text-(--text-secondary)">
                    Managed from Users and permissions
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => void save()}
                loading={saving}
                disabled={!trimmed || unchanged}
              >
                Save
              </Button>
            </div>
          </div>
        </Card>
      </Layout.AnnotatedSection>
    </Layout>
  );
}

/**
 * One logo, Shopify Brand-settings style: with a logo set it's a compact row
 * (thumbnail, name and use, Replace / Remove on the right); with none it's a
 * drop zone to add one.
 */
function LogoField({
  label,
  hint,
  url,
  uploading,
  onSelect,
  onClear,
}: {
  label: string;
  hint: string;
  url: string | null;
  uploading: boolean;
  onSelect: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const formats = "PNG or JPG, resized automatically.";

  if (!url) {
    return (
      <div className="flex flex-col gap-1 p-4">
        <DropZone
          label={label}
          accept="image/png,image/jpeg"
          allowMultiple={false}
          size="small"
          disabled={uploading}
          actionTitle={uploading ? "Uploading…" : "Add image"}
          actionHint={formats}
          onDrop={([file]) => onSelect(file)}
        />
        <p className="body-sm text-(--text-secondary)">{hint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <Thumbnail size="large" source={url} alt={label} />
      <div className="min-w-40 flex-1">
        <p className="body-md-semibold">{label}</p>
        <p className="body-sm text-(--text-secondary)">{hint}</p>
        <p className="body-sm text-(--text-secondary)">{formats}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* Picker for Replace; the button below opens it. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            onSelect(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          onClick={() => fileRef.current?.click()}
          loading={uploading}
          accessibilityLabel={`Replace ${label.toLowerCase()}`}
        >
          Replace
        </Button>
        <Button
          variant="plain"
          tone="critical"
          onClick={onClear}
          disabled={uploading}
          accessibilityLabel={`Remove ${label.toLowerCase()}`}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
