# Daily jobs: decided from /proto/daily-jobs (4 Nov 2026)

A day sheet of small jobs for the team ("Take LS68 NYY to the car wash", "Drop the Corsa for its MOT"), in the nav
between Maintenance and Sales at `/daily-jobs`. Table `daily_jobs`, migration 0061; service `daily-job-service.ts`.

**Picked: Day sheet.** One day at a time, as a table.

- Date stepper: ‹ Today, Wednesday 4 November ›, a calendar to jump to any day, "Back to today". The day is in the
  address (`?date=2026-11-06`) so a sheet can be linked.
- Posting sits in the table's own card: job, reg (optional, checked on submit: letters and digits, 2–8 characters),
  priority, Add job. Enter posts it. Today and later days only; past days are read-only.
- Columns: Job (the plate, then the words), Priority, Posted by (avatar, first name · time), Assigned to (avatar and
  first name, or Open), Status (one badge: Pending, With Ali, Done by you), Action (Pick up → Complete; Undo once
  done). The poster can delete a job that isn't done yet.
- Assigned to (6 Nov 2026, migration 0064): posting a job offers "Assign to", active staff by name or Open
  (unassigned), the default. Open jobs can be reassigned from the cell, like priority. Assigning doesn't pick a job
  up and doesn't stop anyone else picking it up, so a job isn't stuck when its assignee is out.
- Order: open jobs by priority (Urgent, High, Normal, Low), oldest first; completed jobs sink to the bottom in the
  order they were done, struck through with a line that draws across in 260ms, `cubic-bezier(0.23, 1, 0.32, 1)`.
- Sizing: the table fills its card and only the Job column flexes and wraps; the others take their content's width.
  Below an 820px-wide table, Posted by moves under the job.
- Changes show at once and roll back with a message if the save fails.

**Rejected**

- **Board** (lanes: To pick up, Picked up, Completed): clear for "what's free", but it spends the most room, long
  jobs make tall cards, and a day with 15 jobs doesn't fit on one screen.
- **Week** (seven day cards side by side): good for planning ahead, but each job gets a 272px column and the strip
  scrolls sideways at office widths. Planning ahead is covered by the date picker instead.
- **Capture** (one smart line that reads the plate, "urgent" and the day out of what you type): fastest to post, but
  parsing is a guess people have to check, and the yard posts a handful of jobs a day, not hundreds.
- **Yard** (touch-first: 14-day strip, progress bar, priority groups, round complete buttons, a sheet to post): the
  right shape for a phone on the forecourt; worth revisiting if staff use it mostly from phones.

**Fixed in the round before the pick**: the first table let the job column grow to its longest line (IndexTable's
`min-width`), pushing Status off the card; status was a badge plus a button of changing width, so the column was
jagged; the hand and check icons, the "Picked up by…" line and a second card for the add row were cut.
