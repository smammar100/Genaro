/** Team messages service: limits, uploads, the one-call save and its clean-up (0065). */
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrls: vi.fn(),
  createSignedUrl: vi.fn(),
}));
const rpc = vi.hoisted(() => vi.fn());
const bucketUsed = vi.hoisted(() => ({ name: "" }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc,
    storage: {
      from: (bucket: string) => {
        bucketUsed.name = bucket;
        return storage;
      },
    },
  }),
}));

import { attachmentProblem, messageService } from "./message-service";

const file = (name: string, size: number, type: string) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};
const MB = 1024 * 1024;
const base = { companyId: "co-1", conversationId: "conv-1" };

beforeEach(() => {
  vi.clearAllMocks();
  storage.upload.mockResolvedValue({ data: {}, error: null });
  storage.remove.mockResolvedValue({ data: [], error: null });
  rpc.mockResolvedValue({ data: "msg-1", error: null });
  vi.spyOn(crypto, "randomUUID").mockReturnValue("11111111-2222-4333-8444-555555555555");
});

describe("attachmentProblem", () => {
  it("allows up to 3 photos and 3 files, each 5 MB", () => {
    const p = [1, 2, 3].map((i) => ({ name: `p${i}.jpg`, size: 5 * MB }));
    expect(attachmentProblem(p, p)).toBeNull();
  });
  it("says what to do about a fourth photo or file", () => {
    const four = [1, 2, 3, 4].map((i) => ({ name: `p${i}.jpg`, size: 1 }));
    expect(attachmentProblem(four, [])).toBe("A message holds up to 3 photos. Send these, then add the rest.");
    expect(attachmentProblem([], four)).toBe("A message holds up to 3 files. Send these, then add the rest.");
  });
  it("names a file over 5 MB and its size", () => {
    expect(attachmentProblem([{ name: "LS68 forecourt.jpg", size: 7.2 * MB }], [])).toBe("LS68 forecourt.jpg is 7.2 MB. Photos can be up to 5 MB.");
    expect(attachmentProblem([], [{ name: "V5C scan.pdf", size: 6 * MB }])).toBe("V5C scan.pdf is 6.0 MB. Files can be up to 5 MB.");
  });
});

describe("messageService.send", () => {
  it("uploads each photo and file under <company>/<conversation>/<message>/, then saves them with the message in one call", async () => {
    const id = await messageService.send({
      ...base,
      body: "  LS68 NYY before the valet  ",
      photos: [file("front.jpg", 2 * MB, "image/jpeg"), file("back.jpg", 2 * MB, "image/jpeg")],
      files: [file("PDI checklist.pdf", 300_000, "application/pdf")],
    });
    expect(id).toBe("11111111-2222-4333-8444-555555555555");
    expect(bucketUsed.name).toBe("message-attachments");
    const folder = "co-1/conv-1/11111111-2222-4333-8444-555555555555";
    expect(storage.upload.mock.calls.map((c) => c[0])).toEqual([`${folder}/1-front.jpg`, `${folder}/2-back.jpg`, `${folder}/3-PDI checklist.pdf`]);
    expect(rpc).toHaveBeenCalledWith("send_message", {
      p_conversation_id: "conv-1",
      p_message_id: "11111111-2222-4333-8444-555555555555",
      p_body: "LS68 NYY before the valet",
      p_attachments: [
        { kind: "photo", path: `${folder}/1-front.jpg`, name: "front.jpg", size: 2 * MB, type: "image/jpeg" },
        { kind: "photo", path: `${folder}/2-back.jpg`, name: "back.jpg", size: 2 * MB, type: "image/jpeg" },
        { kind: "file", path: `${folder}/3-PDI checklist.pdf`, name: "PDI checklist.pdf", size: 300_000, type: "application/pdf" },
      ],
    });
  });

  it("sends text alone without touching storage", async () => {
    await messageService.send({ ...base, body: "On my way", photos: [], files: [] });
    expect(storage.upload).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("send_message", expect.objectContaining({ p_body: "On my way", p_attachments: [] }));
  });

  it("refuses a fourth photo before uploading anything", async () => {
    const four = [1, 2, 3, 4].map((i) => file(`p${i}.jpg`, 1000, "image/jpeg"));
    await expect(messageService.send({ ...base, body: "", photos: four, files: [] })).rejects.toThrow("A message holds up to 3 photos");
    expect(storage.upload).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses an empty message", async () => {
    await expect(messageService.send({ ...base, body: "   ", photos: [], files: [] })).rejects.toThrow("Write a message or attach a photo or file.");
  });

  it("removes the uploads and shows the database's reason when the save fails", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "You're not in this conversation", code: "P0001" } });
    await expect(messageService.send({ ...base, body: "hi", photos: [file("a.jpg", 1000, "image/jpeg")], files: [] })).rejects.toThrow(
      "You're not in this conversation",
    );
    expect(storage.remove).toHaveBeenCalledWith(["co-1/conv-1/11111111-2222-4333-8444-555555555555/1-a.jpg"]);
  });

  it("removes what was uploaded when a later upload fails", async () => {
    storage.upload.mockResolvedValueOnce({ data: {}, error: null }).mockResolvedValueOnce({ data: null, error: { message: "The object exceeded the maximum allowed size" } });
    await expect(
      messageService.send({ ...base, body: "", photos: [file("a.jpg", 1000, "image/jpeg"), file("b.jpg", 1000, "image/jpeg")], files: [] }),
    ).rejects.toThrow("The object exceeded the maximum allowed size");
    expect(storage.remove).toHaveBeenCalledWith(["co-1/conv-1/11111111-2222-4333-8444-555555555555/1-a.jpg"]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps odd characters out of storage paths but the real name on the attachment", async () => {
    await messageService.send({ ...base, body: "", photos: [], files: [file("Invoice #42 / Raza's copy?.pdf", 10, "application/pdf")] });
    const path = storage.upload.mock.calls[0][0] as string;
    expect(path.endsWith("/1-Invoice _42 _ Raza_s copy_.pdf")).toBe(true);
    expect((rpc.mock.calls[0][1] as { p_attachments: { name: string }[] }).p_attachments[0].name).toBe("Invoice #42 / Raza's copy?.pdf");
  });
});

describe("messageService.start and listConversations", () => {
  it("starts a direct chat with one teammate, and a named group with several", async () => {
    rpc.mockResolvedValue({ data: "conv-9", error: null });
    await messageService.start(["u-raza"]);
    expect(rpc).toHaveBeenLastCalledWith("start_conversation", { p_member_ids: ["u-raza"], p_name: null });
    await messageService.start(["u-raza", "u-sik"], "  Saturday stock count ");
    expect(rpc).toHaveBeenLastCalledWith("start_conversation", { p_member_ids: ["u-raza", "u-sik"], p_name: "Saturday stock count" });
  });

  it("reads your conversations with their unread counts", async () => {
    rpc.mockResolvedValue({
      data: [{ id: "c1", kind: "group", name: null, member_ids: ["a", "b"], last_message_at: "2026-11-06T10:00:00Z", last_body: "hi", last_author_id: "b", last_photos: 2, last_files: 0, unread: 3 }],
      error: null,
    });
    expect(await messageService.listConversations()).toEqual([
      { id: "c1", kind: "group", name: null, memberIds: ["a", "b"], lastMessageAt: "2026-11-06T10:00:00Z", lastBody: "hi", lastAuthorId: "b", lastPhotos: 2, lastFiles: 0, unread: 3 },
    ]);
  });

  it("turns a database error into a readable one", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Everyone in a conversation has to be an active member of your team" } });
    await expect(messageService.start(["stranger"])).rejects.toThrow("Everyone in a conversation has to be an active member of your team");
  });
});
