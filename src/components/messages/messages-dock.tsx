"use client";

import "./messages.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar, Badge, Button, Card } from "@/components/genaro";
import { useAuth } from "@/contexts/auth-context";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { authService } from "@/lib/services/auth-service";
import { messageService } from "@/lib/services/message-service";
import type { TeamConversation, UUID, User } from "@/lib/types";
import { ConversationList, NewConversation, type Teammate } from "./conversation-list";
import { ConversationThread } from "./conversation-thread";
import { conversationTitle, firstName, previewOf } from "./message-parts";
import { useTeamPictures } from "@/hooks/use-team-pictures";

type View = { name: "list" } | { name: "new" } | { name: "thread"; id: UUID };

/**
 * Team messages, decided from /proto/messages (docs/messages.md): a round
 * button bottom right on every page, opening a chat window over the page you're
 * on. Direct chats, group chats and Everyone, up to 3 photos and 3 files per
 * message. Live: new messages arrive over realtime, which only tells members.
 * @import import { MessagesDock } from "@/components/messages/messages-dock";
 */
export function MessagesDock() {
  const { user, company } = useAuth();
  const picture = useTeamPictures();
  const me = user?.id ?? null;
  const companyId = company?.id ?? null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ name: "list" });
  const [conversations, setConversations] = useState<TeamConversation[] | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [peek, setPeek] = useState<TeamConversation | null>(null);
  const launcher = useRef<HTMLDivElement>(null);
  const seen = useRef<Map<string, string | null> | null>(null);

  useEffect(() => {
    if (!companyId) return;
    void authService.getUsersForCompany(companyId).then(setTeam).catch(() => undefined);
  }, [companyId]);
  const people = useMemo(() => new Map(team.map((u) => [u.id, u.name])), [team]);
  const teammates: Teammate[] = useMemo(
    () => team.filter((u) => u.active && u.id !== me).map((u) => ({ id: u.id, name: u.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [team, me],
  );

  const openThreadId = open && view.name === "thread" ? view.id : null;
  const refresh = useCallback(async () => {
    try {
      const list = await messageService.listConversations();
      // Something new from someone else, in a conversation you're not looking at, peeks above the button.
      const before = seen.current;
      if (before) {
        const fresh = list.find((c) => c.lastMessageAt && c.lastMessageAt !== before.get(c.id) && c.lastAuthorId !== me && c.id !== openThreadId);
        if (fresh) setPeek(fresh);
      }
      seen.current = new Map(list.map((c) => [c.id, c.lastMessageAt]));
      setConversations(list);
    } catch {
      setConversations((c) => c ?? []);
    }
  }, [me, openThreadId]);

  useEffect(() => {
    if (!companyId) return;
    void refresh();
    // refresh changes with the open thread; the first load only needs the company.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);
  useRealtimeTable({
    table: "messages",
    companyId,
    onChange: () => {
      void refresh();
      setReloadKey((k) => k + 1);
    },
  });
  useEffect(() => {
    if (!peek) return;
    const t = window.setTimeout(() => setPeek(null), 6000);
    return () => window.clearTimeout(t);
  }, [peek]);

  if (!me || !companyId) return null;
  const unread = (conversations ?? []).reduce((s, c) => s + (c.id === openThreadId ? 0 : c.unread), 0);
  const active = view.name === "thread" ? conversations?.find((c) => c.id === view.id) ?? null : null;

  const close = () => {
    setOpen(false);
    launcher.current?.querySelector("button")?.focus();
  };
  const openConversation = (id: UUID) => {
    setView({ name: "thread", id });
    setOpen(true);
    setPeek(null);
    // Back to the list marks it read there too.
    setConversations((all) => all?.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) ?? all);
  };

  return (
    <>
      {peek && !open ? (
        <div className="messages-dock-in messages-above fixed z-40 w-[320px] max-w-[calc(100vw-3rem)]">
          <Card padding="0">
            <Button variant="tertiary" fullWidth textAlign="left" onClick={() => openConversation(peek.id)}>
              <span className="flex w-full min-w-0 items-start gap-3 p-1 text-left">
                <span aria-hidden>
                  <Avatar name={people.get(peek.lastAuthorId ?? "") ?? "Someone"} size="lg" source={picture(peek.lastAuthorId)} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="body-md truncate font-semibold text-(--text)">
                    {firstName(people.get(peek.lastAuthorId ?? "") ?? "Someone")}
                    {peek.kind === "direct" ? "" : ` in ${conversationTitle(peek, me, people)}`}
                  </span>
                  <span className="body-sm line-clamp-2 whitespace-normal font-normal text-(--text-secondary)">{previewOf(peek, me, people)}</span>
                </span>
              </span>
            </Button>
          </Card>
        </div>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label="Messages"
          className="messages-dock-in messages-above messages-window fixed z-40 flex w-[min(392px,calc(100vw-3rem))] flex-col overflow-hidden rounded-(--radius-400) bg-(--bg-surface) shadow-(--shadow-600)"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector("[role=dialog][aria-modal=true]")) close();
          }}
        >
          {view.name === "new" ? (
            <NewConversation
              teammates={teammates}
              onBack={() => setView({ name: "list" })}
              onClose={close}
              onStarted={(id) => {
                void refresh();
                openConversation(id);
              }}
            />
          ) : view.name === "thread" && active ? (
            <ConversationThread
              key={active.id}
              conversation={active}
              me={me}
              companyId={companyId}
              people={people}
              reloadKey={reloadKey}
              onBack={() => setView({ name: "list" })}
              onClose={close}
              onSent={() => void refresh()}
            />
          ) : (
            <ConversationList conversations={conversations} me={me} people={people} onOpen={openConversation} onNew={() => setView({ name: "new" })} onClose={close} />
          )}
        </div>
      ) : null}

      {/* The round chat button; the unread count sits on its corner. */}
      <div ref={launcher} className="messages-corner fixed z-40">
        <Button
          variant="primary"
          size="large"
          icon={<MessageCircle />}
          className="size-12 rounded-(--radius-750)"
          ariaExpanded={open}
          accessibilityLabel={unread ? `Messages, ${unread} unread` : "Messages"}
          onClick={() => {
            if (open) close();
            else {
              setOpen(true);
              setPeek(null);
              void refresh();
            }
          }}
        />
        {unread ? (
          <span className="pointer-events-none absolute -right-1 -top-1" aria-hidden>
            <Badge tone="critical" strong>
              {unread > 99 ? "99+" : String(unread)}
            </Badge>
          </span>
        ) : null}
      </div>
    </>
  );
}
