"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Download, File as FileIcon, FileSpreadsheet, FileText } from "lucide-react";
import { Button, Modal, Spinner } from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { formatBytes, messageService } from "@/lib/services/message-service";
import { toast } from "@/lib/toast";
import type { TeamConversation, UUID } from "@/lib/types";

/** A photo or file as a message shows it: from storage (path) or still local (url). */
export interface ShownAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Storage path once it's saved; null while it's only on this device. */
  path: string | null;
  /** A link to show it: a signed URL, or a local preview while sending. */
  url: string | null;
}

// ── Words ────────────────────────────────────────────────────────────────
export const firstName = (name: string) => name.split(" ")[0];
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toDateString();
export function dayLabel(iso: string): string {
  if (dayKey(iso) === new Date().toDateString()) return "Today";
  if (dayKey(iso) === new Date(Date.now() - 86_400_000).toDateString()) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
/** "08:14" today, "Yesterday", the weekday this week, else "4 Nov". */
export function shortWhen(iso: string): string {
  const label = dayLabel(iso);
  if (label === "Today") return timeOf(iso);
  if (label === "Yesterday") return label;
  return Date.now() - new Date(iso).getTime() < 6 * 86_400_000
    ? new Date(iso).toLocaleDateString("en-GB", { weekday: "short" })
    : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Messages from one person within five minutes read as one run. */
export function startsRun(list: { authorId: string; createdAt: string }[], i: number): boolean {
  const m = list[i];
  const prev = list[i - 1];
  return !prev || prev.authorId !== m.authorId || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60_000 || dayKey(prev.createdAt) !== dayKey(m.createdAt);
}
export const startsDay = (list: { createdAt: string }[], i: number) => i === 0 || dayKey(list[i - 1].createdAt) !== dayKey(list[i].createdAt);

/** Everyone, a group's name, the other person, or "Raza, Sikander and Shan". */
export function conversationTitle(c: TeamConversation, me: UUID, people: Map<string, string>): string {
  if (c.kind === "everyone") return "Everyone";
  if (c.name) return c.name;
  const others = c.memberIds.filter((id) => id !== me).map((id) => people.get(id) ?? "Someone");
  if (c.kind === "direct") return others[0] ?? "Direct message";
  const firsts = others.map(firstName);
  return firsts.length <= 1 ? (firsts[0] ?? "Group") : `${firsts.slice(0, -1).join(", ")} and ${firsts.at(-1)}`;
}
export function conversationSubtitle(c: TeamConversation, me: UUID, people: Map<string, string>): string {
  if (c.kind === "everyone") return "The whole team";
  if (c.kind === "direct") return "Direct message";
  return c.memberIds.map((id) => (id === me ? "You" : firstName(people.get(id) ?? "Someone"))).join(", ");
}
/** The last message as one line. */
export function previewOf(c: TeamConversation, me: UUID, people: Map<string, string>): string {
  if (!c.lastMessageAt) return "No messages yet";
  const who = c.lastAuthorId === me ? "You: " : c.kind === "direct" ? "" : `${firstName(people.get(c.lastAuthorId ?? "") ?? "Someone")}: `;
  const body =
    c.lastBody?.trim() ||
    (c.lastPhotos ? (c.lastPhotos === 1 ? "Sent a photo" : `Sent ${c.lastPhotos} photos`) : c.lastFiles ? (c.lastFiles === 1 ? "Sent a file" : `Sent ${c.lastFiles} files`) : "");
  return `${who}${body}`.replace(/\s+/g, " ");
}

// ── Text with plates ─────────────────────────────────────────────────────
const PLATE = /\b([A-Z]{2}\d{2}) ?([A-Z]{3})\b/g;
/** Message text with every UK reg in it shown as a plate. */
export function RegText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(PLATE)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    parts.push(<RegPlate key={i} registration={`${m[1]} ${m[2]}`} size="sm" className="mx-0.5 align-baseline" />);
    last = i + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className="whitespace-pre-wrap break-words">{parts}</span>;
}

// ── Files ────────────────────────────────────────────────────────────────
function fileGlyph(a: ShownAttachment) {
  const cls = "size-[18px]";
  if (/csv|sheet|excel/.test(a.type) || /\.(csv|xlsx?)$/i.test(a.name)) return <FileSpreadsheet className={cls} aria-hidden />;
  if (/pdf|text|word/.test(a.type)) return <FileText className={cls} aria-hidden />;
  return <FileIcon className={cls} aria-hidden />;
}

export async function download(a: ShownAttachment) {
  try {
    const url = a.path ? await messageService.downloadUrl(a.path, a.name) : a.url;
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = a.name;
    link.rel = "noopener";
    link.click();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : `Couldn't download ${a.name}.`);
  }
}

export function FileCard({ file, sending }: { file: ShownAttachment; sending?: boolean }) {
  return (
    <span className="flex w-full max-w-[300px] min-w-0 items-center gap-3 rounded-(--radius-300) bg-(--bg-surface-secondary) p-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-(--radius-200) bg-(--bg-surface) text-(--icon-secondary)">{fileGlyph(file)}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="body-md truncate text-(--text)" title={file.name}>
          {file.name}
        </span>
        <span className="body-sm text-(--text-secondary) tabular-nums">{sending ? "Uploading…" : formatBytes(file.size)}</span>
      </span>
      {sending ? (
        <Spinner size="small" accessibilityLabel={`Uploading ${file.name}`} />
      ) : (
        <Button variant="tertiary" size="micro" icon={<Download />} accessibilityLabel={`Download ${file.name}`} onClick={() => void download(file)} />
      )}
    </span>
  );
}

// ── Photos ───────────────────────────────────────────────────────────────
/** Up to three photos: one large, two side by side, or one tall and two stacked. */
export function PhotoGrid({ photos, sending, onOpen }: { photos: ShownAttachment[]; sending?: boolean; onOpen: (index: number) => void }) {
  if (!photos.length) return null;
  const three = photos.length === 3;
  return (
    <span
      className="grid w-full max-w-[260px] gap-1 overflow-hidden rounded-(--radius-300)"
      style={{ gridTemplateColumns: photos.length === 1 ? "1fr" : "1fr 1fr", gridTemplateRows: three ? "1fr 1fr" : undefined }}
    >
      {photos.map((p, i) => (
        <span key={p.id} className={`relative block overflow-hidden bg-(--bg-surface-secondary) ${three && i === 0 ? "row-span-2" : ""}`} style={{ aspectRatio: photos.length === 1 ? "4 / 3" : three && i === 0 ? undefined : "1 / 1" }}>
          <Button
            variant="plain"
            className="messages-photo block size-full *:block *:size-full"
            accessibilityLabel={`Open photo ${i + 1} of ${photos.length}: ${p.name}`}
            onClick={() => onOpen(i)}
          >
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URLs and local previews
              <img src={p.url} alt="" className="size-full object-cover" draggable={false} />
            ) : null}
          </Button>
          {sending ? (
            <span className="pointer-events-none absolute inset-0 grid place-items-center bg-(--bg-surface)/60">
              <Spinner size="small" accessibilityLabel="Uploading photo" />
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

/** Full-size photo viewer: previous / next (and arrow keys), download. */
export function Lightbox({ photos, index, caption, onIndex, onClose }: { photos: ShownAttachment[]; index: number | null; caption: string; onIndex: (i: number) => void; onClose: () => void }) {
  useEffect(() => {
    if (index === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && index < photos.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index, photos.length, onIndex]);
  const p = index === null ? null : photos[index];
  if (!p || index === null) return null;
  return (
    <Modal
      open
      onClose={onClose}
      size="large"
      title={photos.length > 1 ? `Photo ${index + 1} of ${photos.length}` : "Photo"}
      primaryAction={{ content: "Download photo", onAction: () => void download(p) }}
      secondaryActions={
        photos.length > 1
          ? [
              { content: "Previous", onAction: () => index > 0 && onIndex(index - 1) },
              { content: "Next", onAction: () => index < photos.length - 1 && onIndex(index + 1) },
            ]
          : []
      }
    >
      <div className="flex flex-col gap-2">
        {p.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URLs
          <img src={p.url} alt={p.name} className="max-h-[65vh] w-full rounded-(--radius-200) bg-(--bg-surface-secondary) object-contain" />
        ) : null}
        <span className="body-sm text-(--text-secondary)">
          {caption} · {p.name} · {formatBytes(p.size)}
        </span>
      </div>
    </Modal>
  );
}

/** Signed links for a set of storage paths, refetched when the set changes. */
export function useSignedUrls(paths: string[]): Record<string, string> {
  const key = paths.join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const wanted = key ? key.split("|") : [];
    const missing = wanted.filter((p) => !urls[p]);
    if (!missing.length) return;
    let live = true;
    messageService
      .signedUrls(missing)
      .then((got) => live && setUrls((u) => ({ ...u, ...got })))
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // urls is read to skip paths already signed; re-running when it changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}
