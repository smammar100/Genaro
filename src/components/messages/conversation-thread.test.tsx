/** The messages dock's conversation: sending, photos, limits and a failed send (docs/messages.md). */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TeamConversation, TeamMessage } from "@/lib/types";

vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const svc = vi.hoisted(() => ({
  getMessages: vi.fn(),
  markRead: vi.fn(),
  send: vi.fn(),
  signedUrls: vi.fn(),
  downloadUrl: vi.fn(),
}));
vi.mock("@/lib/services/message-service", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/services/message-service")>()),
  messageService: svc,
}));

import { ConversationThread } from "./conversation-thread";

const me = "u-abbas";
const people = new Map([
  ["u-abbas", "Abbas Jaffery"],
  ["u-raza", "Raza Jafri"],
]);
const direct: TeamConversation = {
  id: "c-raza",
  kind: "direct",
  name: null,
  memberIds: [me, "u-raza"],
  lastMessageAt: null,
  lastBody: null,
  lastAuthorId: null,
  lastPhotos: 0,
  lastFiles: 0,
  unread: 0,
};
const MB = 1024 * 1024;
const photo = (name: string, size = 200_000) => {
  const f = new File(["x"], name, { type: "image/jpeg" });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  svc.getMessages.mockResolvedValue([]);
  svc.markRead.mockResolvedValue(undefined);
  svc.signedUrls.mockResolvedValue({});
  svc.send.mockResolvedValue("m-1");
});

const renderThread = (onSent = vi.fn()) => {
  render(
    <ConversationThread conversation={direct} me={me} companyId="co-1" people={people} reloadKey={0} onBack={() => undefined} onClose={() => undefined} onSent={onSent} />,
  );
  return onSent;
};
const box = () => screen.getByRole("textbox", { name: "Message Raza Jafri" });
const paste = (el: HTMLElement, files: File[]) => fireEvent.paste(el, { clipboardData: { files, types: ["Files"] } });

describe("ConversationThread", () => {
  it("opens an empty conversation with the chat illustration and a hello", async () => {
    renderThread();
    expect(await screen.findByText("Say hello to Raza")).toBeInTheDocument();
    expect(document.querySelector("svg.p-illo--chat")).not.toBeNull();
    expect(svc.markRead).toHaveBeenCalledWith("c-raza");
  });

  it("sends on Enter, keeps Shift+Enter for a new line", async () => {
    const onSent = renderThread();
    await screen.findByText("Say hello to Raza");
    fireEvent.change(box(), { target: { value: "Can you move LS68 NYY?" } });
    fireEvent.keyDown(box(), { key: "Enter", shiftKey: true });
    expect(svc.send).not.toHaveBeenCalled();
    fireEvent.keyDown(box(), { key: "Enter" });
    await waitFor(() => expect(svc.send).toHaveBeenCalledWith({ companyId: "co-1", conversationId: "c-raza", body: "Can you move LS68 NYY?", photos: [], files: [] }));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
  });

  it("shows a message at once while it sends, with any reg as a plate", async () => {
    let finish: (v: string) => void = () => undefined;
    svc.send.mockReturnValue(new Promise<string>((r) => (finish = r)));
    renderThread();
    await screen.findByText("Say hello to Raza");
    fireEvent.change(box(), { target: { value: "LS68 NYY is ready" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(await screen.findByText("Sending…")).toBeInTheDocument();
    expect(screen.getByText("LS68 NYY")).toBeInTheDocument();
    expect(box()).toHaveValue("");
    finish("m-1");
    await waitFor(() => expect(screen.queryByText("Sending…")).toBeNull());
  });

  it("opens the send step for pasted photos, then sends them with the caption", async () => {
    renderThread();
    await screen.findByText("Say hello to Raza");
    paste(box(), [photo("front.jpg"), photo("back.jpg")]);
    expect(await screen.findByRole("heading", { name: "Send 2 photos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add more · 2 of 3" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Caption" }), { target: { value: "Before the valet" } });
    fireEvent.click(screen.getByRole("button", { name: "Send 2 photos" }));
    await waitFor(() => expect(svc.send).toHaveBeenCalled());
    const sent = svc.send.mock.calls[0][0] as { body: string; photos: File[] };
    expect(sent.body).toBe("Before the valet");
    expect(sent.photos.map((p) => p.name)).toEqual(["front.jpg", "back.jpg"]);
  });

  it("takes up to 3 photos and says what to do with a fourth", async () => {
    renderThread();
    await screen.findByText("Say hello to Raza");
    paste(box(), [photo("1.jpg"), photo("2.jpg"), photo("3.jpg"), photo("4.jpg")]);
    expect(await screen.findByRole("heading", { name: "Send 3 photos" })).toBeInTheDocument();
    expect(screen.getByText("A message holds up to 3 photos. Send these, then add the rest.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 of 3 photos" })).toBeDisabled();
  });

  it("refuses a photo over 5 MB, naming it and its size", async () => {
    renderThread();
    await screen.findByText("Say hello to Raza");
    paste(box(), [photo("forecourt panorama.jpg", 7.2 * MB)]);
    expect(await screen.findByText("forecourt panorama.jpg is 7.2 MB. Photos can be up to 5 MB.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Send .*photo/ })).toBeNull();
  });

  it("puts the message back with the reason when it can't be sent", async () => {
    svc.send.mockRejectedValue(new Error("You're not in this conversation"));
    renderThread();
    await screen.findByText("Say hello to Raza");
    fireEvent.change(box(), { target: { value: "Are you in today?" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(await screen.findByText("You're not in this conversation")).toBeInTheDocument();
    expect(box()).toHaveValue("Are you in today?");
  });

  it("shows saved messages: mine on the right, with photos opening the viewer", async () => {
    const saved: TeamMessage[] = [
      { id: "m1", conversationId: "c-raza", authorId: "u-raza", body: "Morning", createdAt: "2026-11-06T08:00:00Z", attachments: [] },
      {
        id: "m2",
        conversationId: "c-raza",
        authorId: me,
        body: "",
        createdAt: "2026-11-06T08:01:00Z",
        attachments: [{ id: "a1", kind: "photo", storagePath: "co-1/c-raza/m2/1-a.jpg", name: "a.jpg", sizeBytes: 2 * MB, mimeType: "image/jpeg" }],
      },
    ];
    svc.getMessages.mockResolvedValue(saved);
    svc.signedUrls.mockResolvedValue({ "co-1/c-raza/m2/1-a.jpg": "https://signed/a.jpg" });
    renderThread();
    expect(await screen.findByText("Morning")).toBeInTheDocument();
    await waitFor(() => expect(svc.signedUrls).toHaveBeenCalledWith(["co-1/c-raza/m2/1-a.jpg"]));
    fireEvent.click(await screen.findByRole("button", { name: "Open photo 1 of 1: a.jpg" }));
    expect(await screen.findByRole("dialog", { name: "Photo" })).toBeInTheDocument();
    expect(screen.getByText(/a\.jpg · 2\.0 MB/)).toBeInTheDocument();
  });
});
