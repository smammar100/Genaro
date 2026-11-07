import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { AttachmentKind, ConversationKind, TeamConversation, TeamMessage, UUID } from "@/lib/types";

/**
 * Team messages (migration 0065, docs/messages.md). Clients read their own
 * conversations; every write goes through a database function that checks
 * membership and the attachment rules, so the limits below are also enforced
 * on the server.
 */
const BUCKET = "message-attachments";
export const MAX_PHOTOS = 3;
export const MAX_FILES = 3;
export const MAX_BYTES = 5 * 1024 * 1024;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Why a set of photos and files can't go on one message, or null when it can. */
export function attachmentProblem(photos: { name: string; size: number }[], files: { name: string; size: number }[]): string | null {
  if (photos.length > MAX_PHOTOS) return `A message holds up to ${MAX_PHOTOS} photos. Send these, then add the rest.`;
  if (files.length > MAX_FILES) return `A message holds up to ${MAX_FILES} files. Send these, then add the rest.`;
  const big = [...photos.map((p) => ({ ...p, what: "Photos" })), ...files.map((f) => ({ ...f, what: "Files" }))].find((a) => a.size > MAX_BYTES);
  return big ? `${big.name} is ${formatBytes(big.size)}. ${big.what} can be up to 5 MB.` : null;
}

/** Supabase rejects with plain objects; the dock shows their message, never a bare "Couldn't…". */
function readable(error: unknown, fallback: string): Error {
  const message = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : "";
  return new Error(message || fallback);
}

const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, "_").slice(-120) || "file";

const MESSAGE_SELECT = `
  id,
  conversationId:conversation_id,
  authorId:author_id,
  body,
  createdAt:created_at,
  attachments:message_attachments(id, kind, storagePath:storage_path, name, sizeBytes:size_bytes, mimeType:mime_type)
`;

export const messageService = {
  /** Your conversations, newest first, with members, last message and unread count. */
  async listConversations(): Promise<TeamConversation[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("my_conversations");
    if (error) throw readable(error, "Couldn't load your messages.");
    return (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind as ConversationKind,
      name: r.name,
      memberIds: r.member_ids ?? [],
      lastMessageAt: r.last_message_at,
      lastBody: r.last_body,
      lastAuthorId: r.last_author_id,
      lastPhotos: r.last_photos,
      lastFiles: r.last_files,
      unread: r.unread,
    }));
  },

  /** A conversation's latest messages (oldest first), with their photos and files. */
  async getMessages(conversationId: UUID, limit = 200): Promise<TeamMessage[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw readable(error, "Couldn't load the conversation.");
    return ((data ?? []) as unknown as TeamMessage[])
      .map((m) => ({ ...m, attachments: [...(m.attachments ?? [])].sort((a, b) => a.name.localeCompare(b.name)) }))
      .reverse();
  },

  /** Short-lived links for showing and downloading attachments, by storage path. */
  async signedUrls(paths: string[]): Promise<Record<string, string>> {
    if (!paths.length) return {};
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
    if (error) throw readable(error, "Couldn't load the photos.");
    const out: Record<string, string> = {};
    for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
    return out;
  },

  /** A one-minute link that downloads the attachment under its own name. */
  async downloadUrl(path: string, name: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, { download: name });
    if (error || !data?.signedUrl) throw readable(error, `Couldn't download ${name}.`);
    return data.signedUrl;
  },

  /**
   * One teammate and no name opens your direct chat with them (starting it the
   * first time); several, or a name, starts a group. Returns its id.
   */
  async start(memberIds: UUID[], name?: string): Promise<UUID> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("start_conversation", { p_member_ids: memberIds, p_name: name?.trim() || null });
    if (error) throw readable(error, "Couldn't start the conversation.");
    return data;
  },

  /**
   * Uploads the photos and files under <company>/<conversation>/<message>/,
   * then saves the message and its attachments in one call. A failed save
   * removes the uploads again.
   */
  async send(input: { companyId: UUID; conversationId: UUID; body: string; photos: File[]; files: File[] }): Promise<UUID> {
    const problem = attachmentProblem(input.photos, input.files);
    if (problem) throw new Error(problem);
    if (!input.body.trim() && !input.photos.length && !input.files.length) throw new Error("Write a message or attach a photo or file.");
    const supabase = createClient();
    const messageId = crypto.randomUUID();
    const folder = `${input.companyId}/${input.conversationId}/${messageId}`;
    const items: { kind: AttachmentKind; file: File }[] = [
      ...input.photos.map((file) => ({ kind: "photo" as const, file })),
      ...input.files.map((file) => ({ kind: "file" as const, file })),
    ];
    const uploaded: string[] = [];
    try {
      const attachments = [];
      for (const [i, { kind, file }] of items.entries()) {
        const path = `${folder}/${i + 1}-${safeName(file.name)}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (error) throw readable(error, `Couldn't upload ${file.name}.`);
        uploaded.push(path);
        attachments.push({ kind, path, name: file.name || "Pasted photo.png", size: file.size, type: file.type });
      }
      const { error } = await supabase.rpc("send_message", {
        p_conversation_id: input.conversationId,
        p_message_id: messageId,
        p_body: input.body.trim(),
        p_attachments: attachments as unknown as Json,
      });
      if (error) throw readable(error, "Couldn't send the message.");
      return messageId;
    } catch (e) {
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded).catch(() => undefined);
      throw e;
    }
  },

  async markRead(conversationId: UUID): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
    if (error) throw readable(error, "Couldn't mark the conversation read.");
  },
};
