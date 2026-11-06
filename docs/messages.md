# Team messages: decided from /proto/messages (6 Nov 2026)

Staff message each other from any page. Picked from three working prototypes, each grounded in Mobbin references
(Slack, ClickUp, Dialpad; Microsoft Teams, Literal, WhatsApp, ChatGPT; Pinterest, Asana, Square, Telegram).

**Picked: Dock.** A chat window that floats over the page you're on, so you talk about the car or deal in front of
you without leaving it.

- Launcher: a round dark button, bottom right, 48px, a chat icon only (no label), the unread count as a critical
  badge on its corner. Primary button styling, `--radius-750` makes it round.
- Window: 392 × up to 620px (never taller than the viewport minus 10rem), bottom right above the launcher, opens
  scaling from the bottom-right corner (200ms, `cubic-bezier(0.23, 1, 0.32, 1)`, 0.96 → 1, off for reduced motion).
  Not modal: the page behind stays usable. Escape and the − button close it and return focus to the launcher.
- List: search (names and message text), then conversations by latest message. Each row: avatar, name, last message
  ("You: …", "Sent 3 photos"), and a right-hand column with the time over the unread count, so the two never meet.
- New message (the pencil): pick one teammate for a direct chat, or several for a group chat, with an optional
  group name. An existing direct chat with that person opens instead of a new one. Everyone (the whole company) is
  always there.
- Thread: back to the list, the conversation's name and who's in it. Bubbles: yours right on the brand fill, theirs
  left on surface-secondary; a run from one person within five minutes groups under one name and time; day labels
  ("Today", "Yesterday", "Tuesday 4 November") as plain captions, no rules. Any UK reg in a message shows as a plate.
- Photos: up to 3 per message, 5 MB each. One shows large, two side by side, three as one tall and two stacked.
  Tapping one opens the viewer (previous / next, arrow keys, download).
- Files: up to 3 per message, 5 MB each, as a card with the name, size and a download button.
- Sending photos opens a send step first (Telegram): the photos large, a caption, "Add more · 2 of 3", then
  "Send 2 photos". Files go straight into the message box's tray.
- Message box: Enter sends, Shift+Enter is a new line, Cmd/Ctrl+Enter also sends. Photos and files also come by
  paste and by dropping onto the conversation ("Drop to attach"). A broken rule says what to do next to the box:
  "LS68 forecourt.jpg is 7.2 MB. Photos can be up to 5 MB."; "A message holds up to 3 photos. Send these, then add
  the rest."
- Sending is optimistic: the message shows at once with "Sending…" and a spinner on its photos, then settles.
- A message that arrives while the window is shut peeks above the launcher for six seconds ("Sikander in Sales"
  and the first line); clicking it opens that conversation.
- Lists that scroll keep their items at full height (`*:shrink-0`); a thread opens at the newest message and stays
  pinned there as photos load, unless you've scrolled up to read.

**Rejected**

- **Inbox** (Slack-style two-pane page: channels and people on the left, a dense left-aligned timeline with names on
  every run, a "New messages" marker): the clearest for heavy chat days and scanning a busy channel, but it's a page
  of its own, so every message means leaving the car or deal you were on. It's also desktop-first.
- **Chat** (Teams-style page with bubbles, a large photo grid, and a Photos & files tab per conversation): the
  warmest and best on a phone, and the media tab is worth having, but it shares Inbox's cost of being a separate
  page. The Photos & files tab is the piece to bring into the Dock later if people ask for it.

**Built as** (6 Nov 2026): tables `conversations`, `conversation_members`, `messages`, `message_attachments`, the
private storage bucket `message-attachments` (5 MB per file) and live updates over realtime (migration 0065).
