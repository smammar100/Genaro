/** The messages dock: the round button, the window, the empty state and starting chats (docs/messages.md). */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { TeamConversation, User } from "@/lib/types";

const auth = vi.hoisted(() => ({ user: { id: "u-abbas" }, company: { id: "co-1" } }));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/use-realtime-table", () => ({ useRealtimeTable: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const team = [
  { id: "u-abbas", name: "Abbas Jaffery", active: true },
  { id: "u-raza", name: "Raza Jafri", active: true },
  { id: "u-sik", name: "Sikander Jaffery", active: true },
  { id: "u-gone", name: "Old Account", active: false },
] as unknown as User[];
vi.mock("@/lib/services/auth-service", () => ({ authService: { getUsersForCompany: vi.fn(async () => team) } }));
const svc = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getMessages: vi.fn(),
  markRead: vi.fn(),
  start: vi.fn(),
  send: vi.fn(),
  signedUrls: vi.fn(),
  downloadUrl: vi.fn(),
}));
vi.mock("@/lib/services/message-service", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/services/message-service")>()),
  messageService: svc,
}));

import { MessagesDock } from "./messages-dock";

const conv = (o: Partial<TeamConversation>): TeamConversation => ({
  id: "c",
  kind: "direct",
  name: null,
  memberIds: ["u-abbas", "u-raza"],
  lastMessageAt: null,
  lastBody: null,
  lastAuthorId: null,
  lastPhotos: 0,
  lastFiles: 0,
  unread: 0,
  ...o,
});
const everyone = conv({ id: "c-all", kind: "everyone", memberIds: ["u-abbas"] });

beforeEach(() => {
  vi.clearAllMocks();
  svc.listConversations.mockResolvedValue([everyone]);
  svc.getMessages.mockResolvedValue([]);
  svc.markRead.mockResolvedValue(undefined);
  svc.signedUrls.mockResolvedValue({});
  svc.start.mockResolvedValue("c-new");
});

const launcher = () => screen.getByRole("button", { name: /^Messages/ });
const dock = () => screen.getByRole("dialog", { name: "Messages" });

describe("MessagesDock", () => {
  it("is a round chat button that carries the unread count", async () => {
    svc.listConversations.mockResolvedValue([
      everyone,
      conv({ id: "c-raza", lastMessageAt: "2026-11-06T09:00:00Z", lastBody: "Keys are in the safe", lastAuthorId: "u-raza", unread: 2 }),
      conv({ id: "c-g", kind: "group", memberIds: ["u-abbas", "u-raza", "u-sik"], lastMessageAt: "2026-11-06T08:00:00Z", lastBody: "Done", lastAuthorId: "u-sik", unread: 1 }),
    ]);
    render(<MessagesDock />);
    await waitFor(() => expect(launcher()).toHaveAccessibleName("Messages, 3 unread"));
    expect(launcher()).toHaveClass("rounded-(--radius-750)");
    expect(launcher()).toHaveTextContent("");
  });

  it("opens a window over the page, and Escape closes it back to the button", async () => {
    render(<MessagesDock />);
    fireEvent.click(launcher());
    expect(await screen.findByRole("dialog", { name: "Messages" })).toBeInTheDocument();
    fireEvent.keyDown(dock(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Messages" })).toBeNull());
    expect(launcher()).toHaveFocus();
  });

  it("shows the empty state, with both ways in, before anyone has written", async () => {
    render(<MessagesDock />);
    fireEvent.click(launcher());
    expect(await within(dock()).findByRole("heading", { name: "No messages yet" })).toBeInTheDocument();
    expect(dock().querySelector("svg.p-illo--chat")).not.toBeNull();
    fireEvent.click(within(dock()).getByRole("button", { name: "Post to Everyone" }));
    expect(await within(dock()).findByRole("heading", { name: "Everyone" })).toBeInTheDocument();
    expect(await within(dock()).findByText("Nothing posted to Everyone yet")).toBeInTheDocument();
  });

  it("lists conversations with the time over the unread count", async () => {
    svc.listConversations.mockResolvedValue([conv({ id: "c-raza", lastMessageAt: new Date().toISOString(), lastBody: "Keys are in the safe", lastAuthorId: "u-raza", unread: 2 }), everyone]);
    render(<MessagesDock />);
    fireEvent.click(launcher());
    const row = await within(dock()).findByRole("button", { name: "Raza Jafri, 2 unread" });
    expect(row).toHaveTextContent("Keys are in the safe");
    expect(row).toHaveTextContent("2");
  });

  it("starts a direct chat with one teammate", async () => {
    render(<MessagesDock />);
    fireEvent.click(launcher());
    fireEvent.click(await within(dock()).findByRole("button", { name: "New message" }));
    // Active teammates only, and not you.
    const names = within(dock()).getAllByRole("checkbox").map((c) => c.closest("label")?.textContent?.trim());
    expect(names).toEqual(["Raza Jafri", "Sikander Jaffery"]);
    expect(within(dock()).getByRole("button", { name: "Start chat" })).toBeDisabled();
    fireEvent.click(within(dock()).getByRole("checkbox", { name: "Raza Jafri" }));
    expect(within(dock()).queryByRole("textbox", { name: "Group name" })).toBeNull();
    fireEvent.click(within(dock()).getByRole("button", { name: "Start chat" }));
    await waitFor(() => expect(svc.start).toHaveBeenCalledWith(["u-raza"], undefined));
  });

  it("starts a named group chat with several teammates", async () => {
    render(<MessagesDock />);
    fireEvent.click(launcher());
    fireEvent.click(await within(dock()).findByRole("button", { name: "New message" }));
    fireEvent.click(within(dock()).getByRole("checkbox", { name: "Raza Jafri" }));
    fireEvent.click(within(dock()).getByRole("checkbox", { name: "Sikander Jaffery" }));
    fireEvent.change(within(dock()).getByRole("textbox", { name: "Group name" }), { target: { value: "Saturday stock count" } });
    fireEvent.click(within(dock()).getByRole("button", { name: "Start group chat · 3 people" }));
    await waitFor(() => expect(svc.start).toHaveBeenCalledWith(["u-raza", "u-sik"], "Saturday stock count"));
  });
});
