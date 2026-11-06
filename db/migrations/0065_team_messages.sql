-- 0065_team_messages.sql
--
-- Team messages (decided from /proto/messages, docs/messages.md, 6 Nov 2026):
-- staff message each other from a dock on every page. Direct chats, group
-- chats and one Everyone conversation per company. Up to 3 photos and 3 files
-- per message, 5 MB each, in the private bucket `message-attachments`.
--
-- Clients only READ these tables, and only what they're a member of. Every
-- write goes through a SECURITY DEFINER function below, which checks who you
-- are, that everyone is on your team and the attachment rules, so a crafted
-- request can't post into someone else's conversation. Safe to re-run.

-- ── 1. Tables ───────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null,
  -- A group's own name; null for direct chats, Everyone and unnamed groups.
  name text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_kind_check check (kind in ('everyone', 'direct', 'group')),
  constraint conversations_name_length check (name is null or length(btrim(name)) between 1 and 80)
);
create unique index if not exists conversations_one_everyone on public.conversations (company_id) where kind = 'everyone';
create index if not exists conversations_company_idx on public.conversations (company_id, last_message_at desc);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  -- Messages after this are unread for this member.
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null default '',
  created_at timestamptz not null default now(),
  constraint messages_body_length check (length(body) <= 4000)
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null,
  -- <company>/<conversation>/<message>/<file> in the message-attachments bucket.
  storage_path text not null,
  name text not null,
  size_bytes integer not null,
  mime_type text not null default 'application/octet-stream',
  created_at timestamptz not null default now(),
  constraint message_attachments_kind_check check (kind in ('photo', 'file')),
  constraint message_attachments_name_length check (length(name) between 1 and 255),
  constraint message_attachments_size check (size_bytes between 1 and 5242880)
);
create index if not exists message_attachments_message_idx on public.message_attachments (message_id);

-- Up to 3 photos and 3 files on a message, however they're inserted.
create or replace function public.message_attachments_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.message_attachments a where a.message_id = new.message_id and a.kind = new.kind) >= 3 then
    raise exception 'A message holds up to 3 %', case new.kind when 'photo' then 'photos' else 'files' end;
  end if;
  return new;
end;
$$;
drop trigger if exists message_attachments_limit on public.message_attachments;
create trigger message_attachments_limit
  before insert on public.message_attachments
  for each row execute function public.message_attachments_limit();

-- ── 2. Who can see a conversation ───────────────────────────────────────────
-- Everyone in the company sees the Everyone conversation; direct and group
-- chats only their members. SECURITY DEFINER so policies don't recurse.
create or replace function public.is_conversation_member(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.conversations c
     where c.id = conv
       and c.company_id = public.current_company_id()
       and (
         c.kind = 'everyone'
         or exists (
           select 1 from public.conversation_members m
            where m.conversation_id = c.id and m.user_id = (select auth.uid())
         )
       )
  );
$$;

-- A storage path is <company>/<conversation>/...; parsed safely, so objects in
-- other buckets (any name) never break the policy.
create or replace function public.message_path_visible(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/'
      then split_part(path, '/', 1) = public.current_company_id()::text
       and public.is_conversation_member(split_part(path, '/', 2)::uuid)
    else false
  end;
$$;

-- ── 3. Read-only access for clients ─────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select
  using (public.is_conversation_member(id));

drop policy if exists conversation_members_select on public.conversation_members;
create policy conversation_members_select on public.conversation_members for select
  using (public.is_conversation_member(conversation_id));

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using (public.is_conversation_member(conversation_id));

drop policy if exists message_attachments_select on public.message_attachments;
create policy message_attachments_select on public.message_attachments for select
  using (exists (
    select 1 from public.messages m
     where m.id = message_attachments.message_id and public.is_conversation_member(m.conversation_id)
  ));
-- No insert, update or delete policies: writes go through the functions below.

-- ── 4. Writes ───────────────────────────────────────────────────────────────
-- Open a conversation with teammates: one person and no name opens your
-- direct chat with them (starting it if there isn't one); several, or a
-- name, starts a group. Returns the conversation's id.
create or replace function public.start_conversation(p_member_ids uuid[], p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  company uuid := public.current_company_id();
  wanted int;
  others uuid[];
  conv uuid;
  group_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if company is null then
    raise exception 'Sign in to start a conversation';
  end if;
  select count(distinct x) into wanted from unnest(p_member_ids) x where x <> me;
  select coalesce(array_agg(distinct u.id), '{}') into others
    from public.users u
   where u.id = any(p_member_ids) and u.id <> me and u.company_id = company and u.active;
  if wanted = 0 then
    raise exception 'Pick at least one teammate';
  end if;
  if cardinality(others) <> wanted then
    raise exception 'Everyone in a conversation has to be an active member of your team';
  end if;

  if cardinality(others) = 1 and group_name is null then
    select c.id into conv
      from public.conversations c
     where c.company_id = company and c.kind = 'direct'
       and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = me)
       and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = others[1])
     limit 1;
    if conv is not null then
      return conv;
    end if;
    insert into public.conversations (company_id, kind, created_by) values (company, 'direct', me) returning id into conv;
  else
    insert into public.conversations (company_id, kind, name, created_by) values (company, 'group', group_name, me) returning id into conv;
  end if;

  insert into public.conversation_members (conversation_id, user_id, company_id)
  select conv, x, company from unnest(array_append(others, me)) x;
  return conv;
end;
$$;

-- Send a message, with any photos and files already uploaded under
-- <company>/<conversation>/<message id>/. Message and attachments land in one
-- transaction, so nobody sees a message before its photos.
create or replace function public.send_message(p_conversation_id uuid, p_message_id uuid, p_body text, p_attachments jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  company uuid := public.current_company_id();
  v_body text := btrim(coalesce(p_body, ''));
  photos int;
  files int;
  a jsonb;
  prefix text := company::text || '/' || p_conversation_id::text || '/' || p_message_id::text || '/';
begin
  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'You''re not in this conversation';
  end if;
  select count(*) filter (where x->>'kind' = 'photo'), count(*) filter (where x->>'kind' = 'file')
    into photos, files
    from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) x;
  if photos > 3 then
    raise exception 'A message holds up to 3 photos';
  end if;
  if files > 3 then
    raise exception 'A message holds up to 3 files';
  end if;
  if v_body = '' and photos + files = 0 then
    raise exception 'Write a message or attach a photo or file';
  end if;

  insert into public.messages (id, conversation_id, company_id, author_id, body)
  values (p_message_id, p_conversation_id, company, me, v_body);

  for a in select * from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) loop
    if left(a->>'path', length(prefix)) <> prefix then
      raise exception 'An attachment was uploaded to the wrong place';
    end if;
    insert into public.message_attachments (message_id, company_id, kind, storage_path, name, size_bytes, mime_type)
    values (p_message_id, company, a->>'kind', a->>'path', a->>'name', (a->>'size')::int,
            coalesce(nullif(a->>'type', ''), 'application/octet-stream'));
  end loop;

  -- The sender has read everything up to their own message.
  insert into public.conversation_members (conversation_id, user_id, company_id, last_read_at)
  values (p_conversation_id, me, company, now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
  update public.conversations set last_message_at = now() where id = p_conversation_id;
  return p_message_id;
end;
$$;

-- Mark a conversation read up to now (joins you to Everyone the first time).
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_conversation_member(p_conversation_id) then
    return;
  end if;
  insert into public.conversation_members (conversation_id, user_id, company_id, last_read_at)
  values (p_conversation_id, (select auth.uid()), public.current_company_id(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
end;
$$;

-- Your conversations, newest first, each with its members, last message and
-- unread count. Makes sure your company has its Everyone conversation.
create or replace function public.my_conversations()
returns table (
  id uuid,
  kind text,
  name text,
  member_ids uuid[],
  last_message_at timestamptz,
  last_body text,
  last_author_id uuid,
  last_photos int,
  last_files int,
  unread int
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  company uuid := public.current_company_id();
begin
  if company is null then
    return;
  end if;
  insert into public.conversations (company_id, kind, created_by)
  values (company, 'everyone', me)
  on conflict (company_id) where kind = 'everyone' do nothing;
  insert into public.conversation_members (conversation_id, user_id, company_id)
  select c.id, me, company from public.conversations c where c.company_id = company and c.kind = 'everyone'
  on conflict (conversation_id, user_id) do nothing;

  return query
  select
    c.id,
    c.kind,
    c.name,
    (select array_agg(m.user_id order by m.joined_at) from public.conversation_members m where m.conversation_id = c.id),
    c.last_message_at,
    lm.body,
    lm.author_id,
    coalesce(lm.photos, 0),
    coalesce(lm.files, 0),
    (select count(*)::int from public.messages x
      where x.conversation_id = c.id and x.author_id <> me and x.created_at > mine.last_read_at)
  from public.conversations c
  join public.conversation_members mine on mine.conversation_id = c.id and mine.user_id = me
  left join lateral (
    select x.body, x.author_id,
      (select count(*)::int from public.message_attachments a where a.message_id = x.id and a.kind = 'photo') as photos,
      (select count(*)::int from public.message_attachments a where a.message_id = x.id and a.kind = 'file') as files
      from public.messages x
     where x.conversation_id = c.id
     order by x.created_at desc
     limit 1
  ) lm on true
  where c.company_id = company
  order by coalesce(c.last_message_at, c.created_at) desc;
end;
$$;

revoke all on function public.start_conversation(uuid[], text) from public, anon;
revoke all on function public.send_message(uuid, uuid, text, jsonb) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.my_conversations() from public, anon;
grant execute on function public.start_conversation(uuid[], text) to authenticated;
grant execute on function public.send_message(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;

-- ── 5. Files ────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('message-attachments', 'message-attachments', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists message_attachments_storage_select on storage.objects;
create policy message_attachments_storage_select on storage.objects for select
  using (bucket_id = 'message-attachments' and public.message_path_visible(name));

drop policy if exists message_attachments_storage_insert on storage.objects;
create policy message_attachments_storage_insert on storage.objects for insert
  with check (bucket_id = 'message-attachments' and public.message_path_visible(name));

-- Only to clean up your own upload when its message fails to send.
drop policy if exists message_attachments_storage_delete on storage.objects;
create policy message_attachments_storage_delete on storage.objects for delete
  using (bucket_id = 'message-attachments' and owner_id = (select auth.uid())::text);

-- ── 6. Live updates ─────────────────────────────────────────────────────────
-- Realtime applies the select policy, so a message only reaches its members.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;
