"use client";

import { useRef, useState, type ComponentType, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  Clock,
  DatabaseBackup,
  ImageIcon,
  KeyRound,
  MapPin,
  Megaphone,
  SquareKanban,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  DropZone,
  Page,
  Select,
  TextField,
  Thumbnail,
  type SelectOption,
} from "@/components/genaro";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { companyService, type LogoKind } from "@/lib/services/company-service";
import { PipelineStageSettings } from "@/components/admin/pipeline-stage-settings";
import { InspectionChecklistSettings } from "@/components/admin/inspection-checklist-settings";
import { LeadChannelSettings } from "@/components/admin/lead-channel-settings";
import { LocationSettings } from "@/components/admin/location-settings";
import { BackupPanel } from "@/components/settings/backup-panel";
import { toast } from "@/lib/toast";
import { authService } from "@/lib/services/auth-service";
import { accountHandle } from "@/lib/auth/username";

/* Settings as a side list (decided from /proto/settings, docs/settings.md):
   every section in one grouped list on the left, the section on the right
   with its title and what it does. A phone gets a Section menu instead. */

type GroupId = "you" | "company" | "stock" | "sales" | "data";
type SectionId =
  | "profile"
  | "details"
  | "branding"
  | "hours"
  | "inspection"
  | "locations"
  | "pipeline"
  | "channels"
  | "backup";

const GROUPS: { id: GroupId; label: string }[] = [
  { id: "you", label: "You" },
  { id: "company", label: "Company" },
  { id: "stock", label: "Stock" },
  { id: "sales", label: "Sales" },
  { id: "data", label: "Data" },
];

interface SectionDef {
  id: SectionId;
  group: GroupId;
  label: string;
  /** What the section does, under its title. */
  description: string;
  icon: ComponentType<{ className?: string }>;
  /** Needs Manage Settings; My profile is everyone's. */
  manage: boolean;
}

const SECTIONS: SectionDef[] = [
  {
    id: "profile",
    group: "you",
    label: "My profile",
    description: "How you appear to your team, and how you sign in.",
    icon: UserRound,
    manage: false,
  },
  {
    id: "details",
    group: "company",
    label: "Company details",
    description: "Name, address and tax details on your invoices.",
    icon: Building2,
    manage: true,
  },
  {
    id: "branding",
    group: "company",
    label: "Branding",
    description: "Your logo on invoices and your mark in the top bar. A new image applies as soon as it's uploaded.",
    icon: ImageIcon,
    manage: true,
  },
  {
    id: "hours",
    group: "company",
    label: "Working hours",
    description: "The hours the Appointment Book calendar shows. Appointments can be booked up to an hour before closing.",
    icon: Clock,
    manage: true,
  },
  {
    id: "inspection",
    group: "stock",
    label: "Inspection checklist",
    description:
      "The points on the vehicle inspection, in order. Renaming an item or its status options is safe at any time; inspections already recorded keep what was answered.",
    icon: ClipboardCheck,
    manage: true,
  },
  {
    id: "locations",
    group: "stock",
    label: "Locations",
    description:
      "Where your cars can be, beside the built-in places: a second yard, another showroom, a unit down the road. Your places show as tabs on All vehicles and as destinations when you move a car. A place can only be removed once no car is there; its name stays in the cars' history.",
    icon: MapPin,
    manage: true,
  },
  {
    id: "pipeline",
    group: "sales",
    label: "Sales pipeline",
    description: "The columns on the sales board, in order. Renaming a stage is safe at any time; deals keep their place.",
    icon: SquareKanban,
    manage: true,
  },
  {
    id: "channels",
    group: "sales",
    label: "Lead channels",
    description:
      "Where your enquiries come from: the options on the Create Lead form, in this order. Hiding a channel keeps it off new leads without changing the ones already recorded against it.",
    icon: Megaphone,
    manage: true,
  },
  {
    id: "backup",
    group: "data",
    label: "Backup",
    description:
      "A complete copy of your data (vehicles, inspections, deals, invoices, customers and more) as an Excel workbook.",
    icon: DatabaseBackup,
    manage: true,
  },
];

const isSectionId = (v: string | null): v is SectionId => SECTIONS.some((s) => s.id === v);

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { can, isSuperUser, isLoading } = usePermissions();
  // My profile is everyone's; the company sections need Manage Settings.
  // Until permissions load, show just the profile.
  const manage = (isSuperUser || can("admin:manage_settings")) && !isLoading;
  const sections = manage ? SECTIONS : SECTIONS.filter((s) => !s.manage);
  // ?section= opens one (the Backup due notification opens Backup). A pick
  // someone can't see falls back to where they land: Company details for a
  // manager, My profile for everyone else.
  const [picked, setPicked] = useState<SectionId | null>(() => {
    const param = searchParams.get("section");
    return isSectionId(param) ? param : null;
  });
  const active: SectionId =
    picked && sections.some((s) => s.id === picked) ? picked : manage ? "details" : "profile";
  const current = SECTIONS.find((s) => s.id === active)!;

  // The URL follows the list through history.replaceState: router.replace on
  // the same route re-renders for nothing (see the Vendors filter).
  function select(id: SectionId) {
    setPicked(id);
    window.history.replaceState(null, "", `/admin/settings?section=${id}`);
  }

  const groups = GROUPS.map((g) => ({
    ...g,
    items: sections.filter((s) => s.group === g.id),
  })).filter((g) => g.items.length > 0);
  const withList = sections.length > 1;

  return (
    <Page
      title="Settings"
      subtitle={manage ? "You, your company and how Car Capital runs." : "How you appear to your team."}
      fullWidth
    >
      <div className={withList ? "grid items-start gap-4 lg:grid-cols-[248px_minmax(0,1fr)]" : "grid gap-4"}>
        {withList ? (
          <>
            <nav aria-label="Settings sections" className="max-lg:hidden lg:sticky lg:top-4">
              <Card padding="0">
                <div className="flex flex-col gap-3 p-2">
                  {groups.map((g) => (
                    <div key={g.id} className="flex flex-col gap-0.5">
                      <p className="body-sm px-2 pt-1 pb-1 text-(--text-secondary)">{g.label}</p>
                      {g.items.map((s) => {
                        const Icon = s.icon;
                        return (
                          <Button
                            key={s.id}
                            variant="tertiary"
                            fullWidth
                            textAlign="left"
                            icon={<Icon className="size-4" />}
                            pressed={s.id === active}
                            ariaControls="settings-section"
                            onClick={() => select(s.id)}
                          >
                            {s.label}
                          </Button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </Card>
            </nav>
            <div className="lg:hidden">
              <Select
                label="Section"
                labelHidden
                options={sections.map((s) => ({
                  value: s.id,
                  label: `${GROUPS.find((g) => g.id === s.group)!.label} · ${s.label}`,
                }))}
                value={active}
                onChange={(v) => select(v as SectionId)}
              />
            </div>
          </>
        ) : null}

        <section
          id="settings-section"
          aria-labelledby="settings-section-title"
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="px-1">
            <h2 id="settings-section-title" className="text-title font-semibold">
              {current.label}
            </h2>
            <p className="body-md max-w-[70ch] text-(--text-secondary)">{current.description}</p>
          </div>
          {/* Keyed so each section starts fresh when it's opened. */}
          <div key={active}>
            <SectionBody id={active} />
          </div>
        </section>
      </div>
    </Page>
  );
}

function SectionBody({ id }: { id: SectionId }) {
  switch (id) {
    case "profile":
      return <ProfileSection />;
    case "details":
      return <CompanyDetailsSection />;
    case "branding":
      return <BrandingSection />;
    case "hours":
      return <WorkingHoursSection />;
    case "inspection":
      return <InspectionChecklistSettings />;
    case "locations":
      return <LocationSettings />;
    case "pipeline":
      return <PipelineStageSettings />;
    case "channels":
      return <LeadChannelSettings />;
    case "backup":
      return <BackupPanel />;
  }
}

/** A card's Save: enabled once something changed, busy while saving. */
function SaveRow({ saving, dirty }: { saving: boolean; dirty: boolean }) {
  return (
    <div className="flex justify-end">
      <Button variant="primary" submit loading={saving} disabled={!dirty}>
        Save
      </Button>
    </div>
  );
}

/**
 * My profile. Everyone can change the name on their card, in the header and
 * in the activity log. The sign-in stays as it is: it's managed from Users
 * and permissions.
 */
function ProfileSection() {
  const { user, revalidate } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [picturing, setPicturing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function changePicture(file: File | undefined) {
    if (!file || !user) return;
    setPicturing(true);
    try {
      await authService.uploadOwnAvatar(file);
      await revalidate({ force: true });
      toast.success("Picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload the picture");
    } finally {
      setPicturing(false);
    }
  }

  async function removePicture() {
    if (!user) return;
    setPicturing(true);
    try {
      await authService.clearOwnAvatar();
      await revalidate({ force: true });
      toast.success("Picture removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove the picture");
    } finally {
      setPicturing(false);
    }
  }
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const trimmed = name.trim();
  const dirty = trimmed !== "" && trimmed !== (user?.name ?? "");

  async function save(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!user || !dirty) return;
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
    <Card>
      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
        {/* Your picture shows wherever your initials did: the top bar, jobs,
            the sales board, messages and the team list. */}
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user?.name || "You"} source={user?.avatarUrl ?? undefined} size="xl" />
          <div className="min-w-40 flex-1">
            <p className="body-md font-semibold text-(--text)">Profile picture</p>
            <p className="body-sm text-(--text-secondary)">
              Shown wherever your initials are: the top bar, jobs, messages and the team list.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                void changePicture(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button onClick={() => fileRef.current?.click()} loading={picturing}>
              {user?.avatarUrl ? "Replace" : "Upload picture"}
            </Button>
            {user?.avatarUrl ? (
              <Button variant="tertiary" tone="critical" disabled={picturing} onClick={() => void removePicture()}>
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <TextField
          label="Your name"
          value={name}
          maxLength={80}
          autoComplete="name"
          onChange={setName}
          helpText="On your card, in the header and against everything you do in the activity log."
          error={tried && !trimmed ? "Add your name" : undefined}
        />
        <div className="flex items-center gap-3 rounded-(--radius-200) bg-(--bg-surface-secondary) px-3 py-2">
          <KeyRound aria-hidden className="size-4 shrink-0 text-(--icon-secondary)" />
          <div className="min-w-0">
            <p className="body-md truncate font-code text-(--text)">{user ? accountHandle(user) : "—"}</p>
            <p className="body-sm text-(--text-secondary)">Your sign-in. Managed from Users and permissions.</p>
          </div>
        </div>
        <SaveRow saving={saving} dirty={dirty} />
      </form>
    </Card>
  );
}

/** Saves part of the company and refreshes it everywhere (top bar mark, invoice logo). */
function useCompanySave() {
  const { user, company, revalidate } = useAuth();
  const [saving, setSaving] = useState(false);
  async function save(patch: Parameters<typeof companyService.update>[1], done: string) {
    if (!user || !company) return;
    setSaving(true);
    try {
      await companyService.update(company.id, patch, user.id);
      await revalidate({ force: true });
      toast.success(done);
    } catch (err) {
      console.error("[settings] save failed:", err);
      toast.error("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }
  return { company, saving, save };
}

function CompanyDetailsSection() {
  const { company, saving, save } = useCompanySave();
  const [name, setName] = useState(company?.name ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [vat, setVat] = useState(company?.vatNumber ?? "");
  const [prefix, setPrefix] = useState(company?.stockIdPrefix ?? "");
  const [tried, setTried] = useState(false);
  const dirty =
    name !== (company?.name ?? "") ||
    address !== (company?.address ?? "") ||
    vat !== (company?.vatNumber ?? "") ||
    prefix !== (company?.stockIdPrefix ?? "");

  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (!name.trim() || !dirty) return;
          void save(
            { name: name.trim(), address, vatNumber: vat, stockIdPrefix: prefix },
            "Company details saved",
          );
        }}
      >
        <TextField
          label="Company name"
          value={name}
          onChange={setName}
          autoComplete="organization"
          error={tried && !name.trim() ? "Add the company's name" : undefined}
        />
        <TextField label="Address" value={address} onChange={setAddress} autoComplete="street-address" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="VAT number" value={vat} onChange={setVat} autoComplete="off" />
          <TextField
            label="Stock ID prefix"
            value={prefix}
            onChange={setPrefix}
            maxLength={4}
            autoComplete="off"
            helpText="Up to 4 characters, before each stock number."
          />
        </div>
        <SaveRow saving={saving} dirty={dirty} />
      </form>
    </Card>
  );
}

/** Quarter-hour steps for the working-hours pickers ("00:00" … "23:45"). */
const QUARTER_HOURS: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

/** Time options, keeping a stored off-grid value (e.g. "08:40") selectable. */
function timeOptions(current: string): SelectOption[] {
  const values =
    QUARTER_HOURS.includes(current) || !current ? QUARTER_HOURS : [...QUARTER_HOURS, current].sort();
  return values.map((v) => ({ label: v, value: v }));
}

function WorkingHoursSection() {
  const { company, saving, save } = useCompanySave();
  const [start, setStart] = useState(company?.workingHoursStart ?? "09:00");
  const [end, setEnd] = useState(company?.workingHoursEnd ?? "18:00");
  const dirty =
    start !== (company?.workingHoursStart ?? "09:00") || end !== (company?.workingHoursEnd ?? "18:00");
  const wrong = end <= start;
  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (wrong || !dirty) return;
          void save({ workingHoursStart: start, workingHoursEnd: end }, "Working hours saved");
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Opens" options={timeOptions(start)} value={start} onChange={setStart} />
          <Select
            label="Closes"
            options={timeOptions(end)}
            value={end}
            onChange={setEnd}
            error={wrong ? "Closes after it opens" : undefined}
          />
        </div>
        <SaveRow saving={saving} dirty={dirty && !wrong} />
      </form>
    </Card>
  );
}

/** Logos apply the moment they're uploaded or removed: no Save to forget. */
function BrandingSection() {
  const { company, save } = useCompanySave();
  const [uploading, setUploading] = useState<LogoKind | null>(null);

  async function upload(file: File | undefined, kind: LogoKind) {
    if (!file || !company) return;
    setUploading(kind);
    try {
      const url = await companyService.uploadLogo(file, company.id, kind);
      await save(kind === "mark" ? { logoMarkUrl: url } : { logoUrl: url }, kind === "mark" ? "Logo mark updated" : "Logo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload the image");
    } finally {
      setUploading(null);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <LogoField
          label="Full logo"
          hint="Logo and wordmark on generated invoices."
          url={company?.logoUrl ?? null}
          uploading={uploading === "full"}
          onSelect={(file) => void upload(file, "full")}
          onClear={() => void save({ logoUrl: "" }, "Logo removed")}
        />
        <LogoField
          label="Logo mark"
          hint="Square icon in the top bar. Your initials show when it's empty."
          url={company?.logoMarkUrl ?? null}
          uploading={uploading === "mark"}
          onSelect={(file) => void upload(file, "mark")}
          onClear={() => void save({ logoMarkUrl: "" }, "Logo mark removed")}
        />
      </div>
    </Card>
  );
}

/**
 * One logo: with a logo set it's a compact row (thumbnail, name and use,
 * Replace / Remove on the right); with none it's a drop zone to add one.
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
      <div className="flex flex-col gap-1">
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
    <div className="flex flex-wrap items-center gap-4">
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
          variant="tertiary"
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
