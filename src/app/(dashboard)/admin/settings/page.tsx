"use client";

import { useId, useRef, useState } from "react";
import {
  Building2,
  ClipboardCheck,
  DatabaseBackup,
  ImageIcon,
  KeyRound,
  Megaphone,
  Upload,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import { Section, SectionStack } from "@/components/ui/section";
import { ResourceList, ResourceListItem } from "@/components/ui/resource-list";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  companyService,
  type LogoKind,
} from "@/lib/services/company-service";
import { PipelineStageSettings } from "@/components/admin/pipeline-stage-settings";
import { InspectionChecklistSettings } from "@/components/admin/inspection-checklist-settings";
import { LeadChannelSettings } from "@/components/admin/lead-channel-settings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackupPanel } from "@/components/settings/backup-panel";
import { toast } from "@/lib/toast";
import { authService } from "@/lib/services/auth-service";
import { accountHandle } from "@/lib/auth/username";

export default function SettingsPage() {
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const addressId = `${baseId}-address`;
  const vatId = `${baseId}-vat`;
  const stockPrefixId = `${baseId}-stock-prefix`;
  const hoursStartId = `${baseId}-hours-start`;
  const hoursEndId = `${baseId}-hours-end`;
  const { user, company, revalidate } = useAuth();
  const { can, isSuperUser, isLoading } = usePermissions();
  const canManage = isSuperUser || can("admin:manage_settings");
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

  async function handleLogoSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: LogoKind,
  ) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-[13px] text-muted-foreground">
          Your profile{canManage ? ", plus company profile, defaults, and inspection checklist" : ""}.
        </p>
      </div>
      {/* My profile is open to everyone; the company tabs need Manage
          Settings. Until permissions load, show just the profile. */}
      <Tabs
        // Remount once permissions settle so the default tab can change
        // (Base UI ignores a changed defaultValue on a mounted Tabs).
        key={canManage && !isLoading ? "manage" : "self"}
        orientation="vertical"
        defaultValue={canManage && !isLoading ? "company" : "profile"}
        className="items-start gap-4 data-[orientation=vertical]:flex-col md:data-[orientation=vertical]:flex-row"
      >
        <Card className="w-full shrink-0 p-2 md:sticky md:top-4 md:w-60">
          <TabsList className="w-full flex-col items-stretch">
            <TabsTrigger value="profile" className="h-8 gap-2 px-2">
                  <UserRound className="size-4 text-[#4a4a4a]" />
                  My profile</TabsTrigger>
            {canManage && (
              <>
                <TabsTrigger value="company" className="h-8 gap-2 px-2">
                  <Building2 className="size-4 text-[#4a4a4a]" />
                  Company</TabsTrigger>
                <TabsTrigger value="inspection" className="h-8 gap-2 px-2">
                  <ClipboardCheck className="size-4 text-[#4a4a4a]" />
                  Inspection Checklist</TabsTrigger>
                <TabsTrigger value="pipeline" className="h-8 gap-2 px-2">
                  <Workflow className="size-4 text-[#4a4a4a]" />
                  Sales Pipeline</TabsTrigger>
                <TabsTrigger value="channels" className="h-8 gap-2 px-2">
                  <Megaphone className="size-4 text-[#4a4a4a]" />
                  Lead Channels</TabsTrigger>
                <TabsTrigger value="backup" className="h-8 gap-2 px-2">
                  <DatabaseBackup className="size-4 text-[#4a4a4a]" />
                  Backup</TabsTrigger>
              </>
            )}
          </TabsList>
        </Card>
        <div className="mx-auto w-full min-w-0 max-w-[784px] flex-1">
        <TabsContent value="profile">
          <ProfilePanel />
        </TabsContent>
        {canManage && (
        <>
        <TabsContent value="company">
          <SectionStack>
          <AnnotatedSection
            title="Branding"
            description="Logos used on invoices and in the sidebar."
          >
            <LogoField
              label="Full logo"
              hint="Shown on generated invoices (logo + wordmark). PNG or JPG; large images are automatically resized."
              url={logoUrl}
              previewClassName="h-16 w-24"
              uploading={uploadingLogo}
              onSelect={(e) => void handleLogoSelect(e, "full")}
              onClear={() => setLogoUrl(null)}
            />
            <LogoField
              label="Logo mark"
              hint="Square icon shown in the sidebar. Falls back to the initials when unset. PNG or JPG."
              url={logoMarkUrl}
              previewClassName="h-16 w-16"
              uploading={uploadingMark}
              onSelect={(e) => void handleLogoSelect(e, "mark")}
              onClear={() => setLogoMarkUrl(null)}
            />
          </AnnotatedSection>
          <AnnotatedSection
            title="Company details"
            description="Name, address and tax details shown on invoices."
          >
            <div className="sm:col-span-2">
              <Label htmlFor={nameId}>Name</Label>
              <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={addressId}>Address</Label>
              <Input
                id={addressId}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={vatId}>VAT number</Label>
              <Input id={vatId} value={vat} onChange={(e) => setVat(e.target.value)} />
            </div>
            <div>
              <Label htmlFor={stockPrefixId}>Stock ID prefix</Label>
              <Input
                id={stockPrefixId}
                value={stockPrefix}
                onChange={(e) => setStockPrefix(e.target.value)}
                maxLength={4}
              />
            </div>
          </AnnotatedSection>
          <AnnotatedSection
            title="Working hours"
            description="Controls the Appointment Book calendar range."
          >
            <div>
              <Label htmlFor={hoursStartId}>Working hours start</Label>
              <p className="mb-2 text-[13px] text-muted-foreground">
                Drives the visible range on the Appointment Book calendar.
              </p>
              <Input
                id={hoursStartId}
                type="time"
                value={hoursStart}
                onChange={(e) => setHoursStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={hoursEndId}>Working hours end</Label>
              <p className="mb-2 text-[13px] text-muted-foreground">
                Appointments can be booked up to one hour before this time.
              </p>
              <Input
                id={hoursEndId}
                type="time"
                value={hoursEnd}
                onChange={(e) => setHoursEnd(e.target.value)}
              />
            </div>
          </AnnotatedSection>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          </SectionStack>
        </TabsContent>
        <TabsContent value="inspection">
          <InspectionChecklistSettings />
        </TabsContent>
        <TabsContent value="backup">
          <BackupPanel />
        </TabsContent>
        <TabsContent value="pipeline">
          <PipelineStageSettings />
        </TabsContent>
        <TabsContent value="channels">
          <LeadChannelSettings />
        </TabsContent>
        </>
        )}
        </div>
      </Tabs>
    </div>
  );
}

/** Shopify Settings section: heading + description outside, fields in a card. */
function AnnotatedSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Section
      title={title}
      description={description}
      cardClassName="grid gap-4 px-4 py-4 sm:grid-cols-2"
    >
      {children}
    </Section>
  );
}

/**
 * Settings → My profile. Every user can change the name shown on their card,
 * in the header and in the activity log. Email / username stay as they are:
 * they are the sign-in identity, managed from Users & Permissions.
 */
function ProfilePanel() {
  const fieldId = useId();
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
    <AnnotatedSection
      title="My profile"
      description="How you appear to your team."
    >
      <div className="grid gap-4 sm:col-span-2">
      <div>
        <Label htmlFor={fieldId}>Your name</Label>
        <p className="mb-2 text-[13px] text-muted-foreground">
          Shown on your card, in the header and against everything you do in
          the activity log.
        </p>
        <Input
          id={fieldId}
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
          }}
        />
        {!trimmed && (
          <p className="mt-1 text-xs text-destructive">Name can&apos;t be empty</p>
        )}
      </div>
      <div>
        <Label>Sign-in</Label>
        <ResourceList className="mt-1">
          <ResourceListItem
            icon={<KeyRound />}
            title={user ? accountHandle(user) : "—"}
            description="Managed from Users & Permissions"
          />
        </ResourceList>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving || !trimmed || unchanged}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      </div>
    </AnnotatedSection>
  );
}

/** One logo uploader (preview + Upload/Replace + Remove). Owns its file input. */
function LogoField({
  label,
  hint,
  url,
  previewClassName,
  uploading,
  onSelect,
  onClear,
}: {
  label: string;
  hint: string;
  url: string | null;
  previewClassName: string;
  uploading: boolean;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  return (
    <div className="sm:col-span-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <p className="mb-2 text-[13px] text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-4">
        <div
          className={`grid shrink-0 place-items-center overflow-hidden rounded-lg ${url ? "" : "border bg-[#f7f7f7]"} ${previewClassName}`}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={label}
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            id={fieldId}
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={onSelect}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onClear}
              disabled={uploading}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
