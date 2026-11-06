"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ChevronLeft, ImageIcon, Minus, Paperclip, SendHorizontal } from "lucide-react";
import { Button, EmptyState, EmptyStateIllustration, InlineError, SkeletonBodyText, TextField } from "@/components/genaro";
import { MAX_FILES, MAX_PHOTOS, formatBytes, messageService } from "@/lib/services/message-service";
import type { TeamConversation, TeamMessage, UUID } from "@/lib/types";
import {
  FileCard,
  Lightbox,
  PhotoGrid,
  RegText,
  conversationSubtitle,
  conversationTitle,
  dayLabel,
  firstName,
  startsDay,
  startsRun,
  timeOf,
  useSignedUrls,
  type ShownAttachment,
} from "./message-parts";
import { pickFiles, useComposer, type Draft, type DraftFile } from "./use-composer";

/** A message as the thread draws it: saved, or still sending from this device. */
interface ShownMessage {
  id: string;
  authorId: UUID;
  body: string;
  createdAt: string;
  photos: ShownAttachment[];
  files: ShownAttachment[];
  sending: boolean;
}

let pendingSeq = 0;
/** An id and time for a message that's still sending from this device. */
function pendingStamp() {
  pendingSeq += 1;
  return { id: `pending-${pendingSeq}`, createdAt: new Date().toISOString() };
}

const fromDraft = (d: DraftFile): ShownAttachment => ({ id: d.id, name: d.file.name || "Pasted photo", size: d.file.size, type: d.file.type, path: null, url: d.url || null });

export function DockHeader({ title, subtitle, onBack, onClose, actions }: { title: string; subtitle?: string; onBack?: () => void; onClose: () => void; actions?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 px-3 pb-2 pt-3">
      {onBack ? <Button variant="tertiary" icon={<ChevronLeft />} accessibilityLabel="All conversations" onClick={onBack} /> : null}
      <div className="flex min-w-0 flex-1 flex-col pl-1">
        <h2 className="heading-sm truncate text-(--text)">{title}</h2>
        {subtitle ? <span className="body-sm truncate text-(--text-secondary)">{subtitle}</span> : null}
      </div>
      {actions}
      <Button variant="tertiary" icon={<Minus />} accessibilityLabel="Close messages" onClick={onClose} />
    </header>
  );
}

/** Drag files anywhere over the conversation to attach them. */
function DropArea({ onFiles, children }: { onFiles: (files: File[]) => void; children: ReactNode }) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        depth.current += 1;
        setOver(true);
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      }}
      onDragOver={(e) => hasFiles(e) && e.preventDefault()}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      {children}
      {over ? (
        <div className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-(--radius-400) border-2 border-dashed border-(--border-focus) bg-(--bg-surface)/85 p-4 text-center">
          <span className="heading-sm text-(--text)">Drop to attach · up to 3 photos, 5 MB each</span>
        </div>
      ) : null}
    </div>
  );
}

export function ConversationThread({
  conversation: c,
  me,
  companyId,
  people,
  reloadKey,
  onBack,
  onClose,
  onSent,
}: {
  conversation: TeamConversation;
  me: UUID;
  companyId: UUID;
  people: Map<string, string>;
  /** Bumped when something changes (a live update); the thread reloads. */
  reloadKey: number;
  onBack: () => void;
  onClose: () => void;
  onSent: () => void;
}) {
  const [saved, setSaved] = useState<TeamMessage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<ShownMessage[]>([]);
  const [viewer, setViewer] = useState<{ photos: ShownAttachment[]; index: number; caption: string } | null>(null);
  // Photos go through a send step first: shown large, with a caption.
  const [staging, setStaging] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const rows = await messageService.getMessages(c.id);
      setSaved(rows);
      setLoadError(null);
      void messageService.markRead(c.id).catch(() => undefined);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load the conversation.");
    }
  }, [c.id]);
  useEffect(() => {
    let live = true;
    messageService
      .getMessages(c.id)
      .then((rows) => {
        if (!live) return;
        setSaved(rows);
        setLoadError(null);
        void messageService.markRead(c.id).catch(() => undefined);
      })
      .catch((e: unknown) => live && setLoadError(e instanceof Error ? e.message : "Couldn't load the conversation."));
    return () => {
      live = false;
    };
  }, [c.id, reloadKey]);

  const urls = useSignedUrls(useMemo(() => (saved ?? []).flatMap((m) => m.attachments.map((a) => a.storagePath)), [saved]));
  const shown: ShownMessage[] = useMemo(
    () => [
      ...(saved ?? []).map((m) => {
        const as = (kind: "photo" | "file") =>
          m.attachments
            .filter((a) => a.kind === kind)
            .map((a) => ({ id: a.id, name: a.name, size: a.sizeBytes, type: a.mimeType, path: a.storagePath, url: urls[a.storagePath] ?? null }));
        return { id: m.id, authorId: m.authorId, body: m.body, createdAt: m.createdAt, photos: as("photo"), files: as("file"), sending: false };
      }),
      ...pending,
    ],
    [saved, pending, urls],
  );

  // Open at the newest message; follow new ones.
  const count = shown.length;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, staging]);

  const composer = useComposer();
  async function send(draft: Draft) {
    const { id, createdAt } = pendingStamp();
    setPending((all) => [
      ...all,
      { id, authorId: me, body: draft.text, createdAt, photos: draft.photos.map(fromDraft), files: draft.files.map(fromDraft), sending: true },
    ]);
    composer.reset();
    setStaging(false);
    try {
      await messageService.send({ companyId, conversationId: c.id, body: draft.text, photos: draft.photos.map((p) => p.file), files: draft.files.map((f) => f.file) });
      await load();
      onSent();
    } catch (e) {
      composer.restore(draft, e instanceof Error ? e.message : "Couldn't send the message. Try again.");
    } finally {
      setPending((all) => all.filter((m) => m.id !== id));
    }
  }

  const addAndStage = (files: File[]) => {
    if (composer.add(files, "auto") > 0) setStaging(true);
  };
  const title = conversationTitle(c, me, people);

  if (staging && composer.photos.length) {
    const n = composer.photos.length;
    return (
      <>
        <DockHeader title={n === 1 ? "Send a photo" : `Send ${n} photos`} subtitle={`To ${title}`} onBack={() => setStaging(false)} onClose={onClose} />
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 *:shrink-0">
          {composer.photos.map((p) => (
            <figure key={p.id} className="relative overflow-hidden rounded-(--radius-300) bg-(--bg-surface-secondary)">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview */}
              <img src={p.url} alt={p.file.name} className="max-h-[220px] w-full object-cover" />
              <figcaption className="body-sm px-2 py-1 text-(--text-secondary)">
                {p.file.name || "Pasted photo"} · {formatBytes(p.file.size)}
              </figcaption>
              <span className="absolute right-2 top-2">
                <Button size="micro" onClick={() => composer.removePhoto(p.id)} accessibilityLabel={`Remove ${p.file.name}`}>
                  Remove
                </Button>
              </span>
            </figure>
          ))}
          {composer.files.length ? (
            <span className="body-sm text-(--text-secondary)">
              And {composer.files.length === 1 ? "1 file" : `${composer.files.length} files`}: {composer.files.map((f) => f.file.name).join(", ")}
            </span>
          ) : null}
        </div>
        <form
          className="flex flex-col gap-2 px-3 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            composer.submitWith(send);
          }}
        >
          <TextField label="Caption" labelHidden placeholder="Add a caption" value={composer.text} onChange={composer.setText} onKeyDown={composer.keyHandler(send)} onPaste={composer.onPaste} />
          {composer.error ? <InlineError message={composer.error} /> : null}
          <div className="flex items-center gap-2">
            <Button disabled={n >= MAX_PHOTOS} onClick={() => pickFiles("image/*", (f) => composer.add(f, "photo"))}>
              {n >= MAX_PHOTOS ? `${MAX_PHOTOS} of ${MAX_PHOTOS} photos` : `Add more · ${n} of ${MAX_PHOTOS}`}
            </Button>
            <span className="flex-1" />
            <Button variant="primary" submit>
              {n === 1 ? "Send photo" : `Send ${n} photos`}
            </Button>
          </div>
        </form>
      </>
    );
  }

  const isGroupish = c.kind !== "direct";
  return (
    <>
      <DockHeader title={title} subtitle={conversationSubtitle(c, me, people)} onBack={onBack} onClose={onClose} />
      <DropArea onFiles={addAndStage}>
        <div
          ref={scroller}
          onLoadCapture={() => {
            const el = scroller.current;
            if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 420) el.scrollTop = el.scrollHeight;
          }}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-2 *:shrink-0"
          role="log"
          aria-live="polite"
          aria-label={`Messages in ${title}`}
        >
          {loadError ? (
            <p className="m-auto max-w-[260px] text-center">
              <InlineError message={loadError} />
            </p>
          ) : saved === null ? (
            <div className="py-3">
              <SkeletonBodyText lines={4} />
            </div>
          ) : !shown.length ? (
            <div className="m-auto">
              <EmptyState
                compact
                illustration={<EmptyStateIllustration variant="chat" size="small" />}
                heading={c.kind === "direct" ? `Say hello to ${firstName(title)}` : c.kind === "everyone" ? "Nothing posted to Everyone yet" : "Start the conversation"}
              >
                Send a note, or a photo of the car you&apos;re looking at. Up to 3 photos a message.
              </EmptyState>
            </div>
          ) : (
            shown.map((m, i) => {
              const mine = m.authorId === me;
              const head = startsRun(shown, i);
              const author = people.get(m.authorId) ?? "Someone";
              return (
                <div key={m.id} className={m.sending ? "messages-arrive" : ""}>
                  {startsDay(shown, i) ? <p className="body-sm my-2 text-center text-(--text-secondary)">{dayLabel(m.createdAt)}</p> : null}
                  <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"} ${head ? "mt-2.5" : "mt-0.5"}`}>
                    {head ? (
                      <span className="body-sm px-1 text-(--text-secondary) tabular-nums">
                        {mine ? `You · ${timeOf(m.createdAt)}` : isGroupish ? `${firstName(author)} · ${timeOf(m.createdAt)}` : timeOf(m.createdAt)}
                      </span>
                    ) : null}
                    <PhotoGrid
                      photos={m.photos}
                      sending={m.sending}
                      onOpen={(index) => setViewer({ photos: m.photos, index, caption: `From ${mine ? "you" : author}, ${dayLabel(m.createdAt)} ${timeOf(m.createdAt)}` })}
                    />
                    {m.files.map((f) => (
                      <FileCard key={f.id} file={f} sending={m.sending} />
                    ))}
                    {m.body ? (
                      <p className={`body-md max-w-[85%] rounded-(--radius-400) px-3 py-1.5 ${mine ? "bg-(--bg-fill-brand) text-(--text-brand-on-bg-fill)" : "bg-(--bg-surface-secondary) text-(--text)"}`}>
                        <RegText text={m.body} />
                      </p>
                    ) : null}
                    {m.sending ? <span className="body-sm px-1 text-(--text-secondary)">Sending…</span> : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <form
          className="flex flex-col gap-1.5 px-3 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            composer.submitWith(send);
          }}
        >
          {composer.files.length ? (
            <div className="flex flex-wrap gap-1.5">
              {composer.files.map((f) => (
                <span key={f.id} className="flex max-w-[220px] items-center gap-1.5 rounded-(--radius-200) bg-(--bg-surface-secondary) py-0.5 pl-2 pr-0.5">
                  <span className="body-sm min-w-0 truncate text-(--text)" title={f.file.name}>
                    {f.file.name}
                  </span>
                  <span className="body-sm shrink-0 text-(--text-secondary) tabular-nums">{formatBytes(f.file.size)}</span>
                  <Button variant="tertiary" size="micro" accessibilityLabel={`Remove ${f.file.name}`} onClick={() => composer.removeFile(f.id)}>
                    Remove
                  </Button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-1">
            <Button variant="tertiary" icon={<ImageIcon />} accessibilityLabel={`Add photos, up to ${MAX_PHOTOS}, 5 MB each`} onClick={() => pickFiles("image/*", addAndStage)} />
            <Button variant="tertiary" icon={<Paperclip />} accessibilityLabel={`Attach files, up to ${MAX_FILES}, 5 MB each`} onClick={() => pickFiles("*/*", (f) => composer.add(f, "file"))} />
            <div className="min-w-0 flex-1">
              <TextField
                label={`Message ${title}`}
                labelHidden
                multiline={composer.rows}
                placeholder="Message"
                value={composer.text}
                onChange={composer.setText}
                onKeyDown={composer.keyHandler(send)}
                onPaste={(e) => {
                  composer.onPaste(e);
                  if (Array.from(e.clipboardData?.files ?? []).some((f) => f.type.startsWith("image/"))) setStaging(true);
                }}
              />
            </div>
            <Button variant="primary" submit icon={<SendHorizontal />} accessibilityLabel="Send message" disabled={!composer.canSend} />
          </div>
          {composer.error ? <InlineError message={composer.error} /> : null}
        </form>
      </DropArea>
      <Lightbox
        photos={viewer?.photos ?? []}
        index={viewer ? viewer.index : null}
        caption={viewer?.caption ?? ""}
        onIndex={(index) => setViewer((v) => (v ? { ...v, index } : v))}
        onClose={() => setViewer(null)}
      />
    </>
  );
}
