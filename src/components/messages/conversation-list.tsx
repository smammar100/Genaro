"use client";

import { useState } from "react";
import { Hash, SquarePen, Users } from "lucide-react";
import { Avatar, Badge, Button, ChoiceList, EmptyState, EmptyStateIllustration, InlineError, TextField } from "@/components/genaro";
import { messageService } from "@/lib/services/message-service";
import type { TeamConversation, UUID } from "@/lib/types";
import { DockHeader } from "./conversation-thread";
import { conversationTitle, previewOf, shortWhen } from "./message-parts";
import { useTeamPictures } from "@/hooks/use-team-pictures";

/** A teammate a conversation can include. */
export interface Teammate {
  id: UUID;
  name: string;
}

function ConversationMark({ c, title }: { c: TeamConversation; title: string }) {
  const picture = useTeamPictures();
  if (c.kind === "direct") return <Avatar name={title} size="lg" source={picture(title)} />;
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-(--radius-750) bg-(--bg-surface-secondary) text-(--icon-secondary)">
      {c.kind === "everyone" ? <Hash className="size-4" aria-hidden /> : <Users className="size-4" aria-hidden />}
    </span>
  );
}

export function ConversationList({
  conversations,
  me,
  people,
  onOpen,
  onNew,
  onClose,
}: {
  conversations: TeamConversation[] | null;
  me: UUID;
  people: Map<string, string>;
  onOpen: (id: UUID) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = (conversations ?? []).filter((c) => !q || conversationTitle(c, me, people).toLowerCase().includes(q) || (c.lastBody ?? "").toLowerCase().includes(q));
  const everyone = conversations?.find((c) => c.kind === "everyone");
  // Nobody has written anything yet: show what it'll look like and where to start.
  if (conversations && !conversations.some((c) => c.lastMessageAt)) {
    return (
      <>
        <DockHeader title="Messages" onClose={onClose} actions={<Button variant="tertiary" icon={<SquarePen />} accessibilityLabel="New message" onClick={onNew} />} />
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain px-3 pb-6">
          <EmptyState
            compact
            illustration={<EmptyStateIllustration variant="chat" size="small" />}
            heading="No messages yet"
            action={{ content: "New message", onAction: onNew }}
            secondaryAction={everyone ? { content: "Post to Everyone", onAction: () => onOpen(everyone.id) } : undefined}
          >
            Message a teammate about a car, start a group for a job, or post to Everyone.
          </EmptyState>
        </div>
      </>
    );
  }
  return (
    <>
      <DockHeader title="Messages" onClose={onClose} actions={<Button variant="tertiary" icon={<SquarePen />} accessibilityLabel="New message" onClick={onNew} />} />
      <div className="px-3 pb-2">
        <TextField label="Search messages" labelHidden prefix="SearchMinor" placeholder="Search" value={query} onChange={setQuery} clearButton onClearButtonClick={() => setQuery("")} />
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2 pb-2 *:shrink-0">
        {conversations === null ? (
          <li className="body-sm p-3 text-(--text-secondary)">Loading your messages…</li>
        ) : !list.length ? (
          <li className="body-sm p-3 text-(--text-secondary)">{q ? `Nothing matches “${query}”.` : "No conversations yet. Start one with the pencil."}</li>
        ) : (
          list.map((c) => {
            const title = conversationTitle(c, me, people);
            return (
              <li key={c.id}>
                <Button
                  variant="tertiary"
                  fullWidth
                  textAlign="left"
                  // The label (the button's only child) fills the row, so the time sits on the right edge.
                  className="*:min-w-0 *:flex-1"
                  onClick={() => onOpen(c.id)}
                  accessibilityLabel={c.unread ? `${title}, ${c.unread} unread` : title}
                >
                  <span className="flex w-full min-w-0 items-center gap-3 py-1 text-left">
                    <span aria-hidden>
                      <ConversationMark c={c} title={title} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`body-md truncate text-(--text) ${c.unread ? "font-semibold" : "font-normal"}`}>{title}</span>
                      <span className={`body-sm truncate font-normal ${c.unread ? "text-(--text)" : "text-(--text-secondary)"}`}>{previewOf(c, me, people)}</span>
                    </span>
                    {/* Time over the count, in their own column, so the two never meet. */}
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="body-sm font-normal text-(--text-secondary) tabular-nums">{c.lastMessageAt ? shortWhen(c.lastMessageAt) : ""}</span>
                      {c.unread ? (
                        <Badge tone="critical" strong>
                          {String(c.unread)}
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                </Button>
              </li>
            );
          })
        )}
      </ul>
    </>
  );
}

/** New message: one teammate opens your direct chat; several (or a name) start a group. */
export function NewConversation({ teammates, onStarted, onBack, onClose }: { teammates: Teammate[]; onStarted: (id: UUID) => void; onBack: () => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const shown = teammates.filter((t) => !q || t.name.toLowerCase().includes(q) || picked.includes(t.id));
  const group = picked.length > 1;

  async function start() {
    if (!picked.length) {
      setError("Pick at least one teammate.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onStarted(await messageService.start(picked, group ? name : undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the conversation.");
      setSaving(false);
    }
  }

  return (
    <>
      <DockHeader title="New message" subtitle="Pick one teammate, or several for a group" onBack={onBack} onClose={onClose} />
      <form
        className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          void start();
        }}
      >
        <TextField label="Find a teammate" labelHidden prefix="SearchMinor" placeholder="Find a teammate" value={query} onChange={setQuery} clearButton onClearButtonClick={() => setQuery("")} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {shown.length ? (
            <ChoiceList title="Teammates" titleHidden allowMultiple choices={shown.map((t) => ({ label: t.name, value: t.id }))} selected={picked} onChange={setPicked} />
          ) : (
            <p className="body-sm text-(--text-secondary)">Nobody on the team matches “{query}”.</p>
          )}
        </div>
        {group ? <TextField label="Group name" helpText="Optional. Without one it's named after the people in it." placeholder="e.g. Saturday stock count" value={name} onChange={setName} maxLength={80} /> : null}
        {error ? <InlineError message={error} /> : null}
        <Button variant="primary" submit fullWidth loading={saving} disabled={!picked.length}>
          {group ? `Start group chat · ${picked.length + 1} people` : "Start chat"}
        </Button>
      </form>
    </>
  );
}
