# Security audit — Car Capital UK (Genaro)

**Date:** 2026-10-26
**Source ref:** `00df8c8` on branch `prep-card-prototype` (worktree clean apart from the untracked, out-of-scope `src/prototypes/`)
**Method:** Cloudflare `security-audit` skill (github.com/cloudflare/security-audit-skill), quick profile — one hunting wave across five parallel read-only hunters, then independent per-candidate verification (the agent that verified a finding never hunted it), then a coverage-critic pass.
**Scope:** `src/app` (every API route under `src/app/api`), `src/proxy.ts`, auth/session (`src/lib/auth`, `src/lib/supabase`, `src/contexts/auth-context.tsx`), `src/lib/services`, capability/role model (`src/lib/capabilities.ts`, `src/lib/roles.ts`, `src/hooks/use-permissions.ts`), SQL migrations and RLS in `db/migrations`, env/secret handling, dependencies, and the webhook/cron endpoints.
**Execution policy:** source-only. No OS-enforced sandbox and no local Supabase on this host, so per the skill no target-controlled code was run, no deployed service was contacted, and no credential was tested. Secret values were never printed.

---

## Executive summary

The codebase shows real, deliberate security engineering: the proxy verifies JWT signatures via `getClaims()`, migration 0023/0024 added capability-gated RLS to the core transactional tables, migration 0025/0026 blocks privileged-column self-edits, the AutoTrader webhook and cron route both fail closed, email templates escape every interpolation, and no `dangerouslySetInnerHTML`/`eval`/`child_process` or committed API key exists anywhere in the tree or its history. Those are documented under "What was checked and found sound".

The audit nonetheless found **one critical authentication flaw** and **two high-severity privilege-escalation paths**, all confirmed from source:

1. **Critical — API authentication can be bypassed.** `requireUser()` falls back to `getSession()`, which on the server trusts the contents of the session cookie without verifying its signature. An attacker who knows any active user's UUID can call any of the 13 `requireUser`-protected API routes as that user, including the admin routes.
2. **High — any staff member can escalate to administrator.** The RLS write policies on `team_invitations` and `team_join_links` are company-scoped only (no capability gate), and `/api/team/accept-join` grants whatever role the stored row carries without an allowlist.
3. **High — any `admin:manage_users` holder can mint a super-user.** `/api/team/create-with-password` takes `roles` from the request body unchecked and sets `is_super_user` when it contains `"owner"`, a control that the sibling `set-roles` route enforces but this route does not.

Beyond those, a recurring **systemic root cause** runs through the data layer: tables added after migration 0023 (`invoice_receipts`, `external_invoices`, `pipeline_stages`, `location_movements`, `deal_notes`, and others) copied a company-only RLS template with no capability predicate and no author binding, so the UI's permission gates are the only thing enforcing them — and the browser can bypass the UI by calling PostgREST directly. This produced four confirmed medium/low findings that share one fix pattern.

Several of the most serious *possible* issues depend on live database and deployment state that is not in the repository (base-table RLS policies, a `SECURITY DEFINER` RPC body, Supabase Auth settings, and whether a committed password was rotated). These are reported separately as **needs-validation** leads with exact owner checks, not as confirmed findings. One of them — committed production owner-account passwords with no MFA — would be **critical if the password was never rotated**, and the check is cheap, so it is called out in the top-3.

**Confirmed:** 1 critical, 2 high, 3 medium, 6 low.
**Needs validation:** 7 leads (1 potentially critical, 1 potentially high).

---

## Confirmed findings

### C1 — Critical: `requireUser()` trusts an unverified session cookie via the `getSession()` fallback

- **Where:** `src/lib/auth/require-user.ts:76-87` (the fallback), feeding the profile/capability load at `src/lib/auth/require-user.ts:113-141`.
- **What's wrong:** `requireUser()` calls `supabase.auth.getUser()` (which validates the token) and, when that returns no user, falls back to `supabase.auth.getSession()` and uses `session.user.id` as the authenticated caller. On the server, `getSession()` reads the session straight from the request cookie and returns it unverified whenever the cookie's own `expires_at` is in the future — it checks only that the object has `access_token`/`refresh_token`/`expires_at` keys (`@supabase/auth-js` `GoTrueClient` `_isValidSession`, `__loadSession`), and never checks a signature or calls the Auth server. A `getUser()` failure that is *not* `session_not_found` (e.g. a malformed token) does not clear the stored session, so the fallback still returns it. `/api/` is excluded from the proxy (`src/proxy.ts:11`), so nothing verifies the token before the route runs, and the profile is then loaded with the **service-role** client, which bypasses RLS.
- **Failure scenario:** A party who is not authenticated (or a deactivated ex-staff member) sends an API request carrying a self-constructed session cookie whose embedded user id is that of a target — any colleague's or administrator's UUID, which staff and ex-staff routinely have and which never rotate. `getUser()` fails on the bogus token, the fallback accepts the cookie's user id, and the request runs as that user. Against `/api/team/create-with-password` (gated on `admin:manage_users`) this means creating a new administrator (or, via finding H1, owner) account with a chosen password, i.e. a durable foothold with full company data access; against the other admin routes it means resetting staff passwords and changing roles. The verifier confirmed the fallback is reachable without even depending on what the Auth server returns.
- **Severity:** likelihood high (needs only an HTTP client and a known UUID — not a secret), impact critical (full impersonation of any account, super-users included, on the service-role admin API). **Overall: critical.** Confirmed by an independent verifier.
- **Fix (smallest):** In `requireUser()`, delete the `getSession()` fallback and return 401 whenever `getUser()` yields no user. `getUser()` already refreshes an expired access token through the refresh-token cookie and writes the new cookies back, so the bug the fallback was added for (expired-token 401s) is already handled. If a fallback must stay, take identity only from verified data — `getClaims()`'s `sub`, or `getUser(session.access_token)` — never from `getSession().session.user`. Update `src/lib/auth/require-user.test.ts:163`, which currently codifies the fallback, to assert a 401. The comment at `require-user.ts:61-67` is also factually wrong about what `getSession()` does and should be corrected.

### H1 — High: `/api/team/create-with-password` lets any `admin:manage_users` holder mint an Owner / super-user

- **Where:** `src/app/api/team/create-with-password/route.ts:79` (only gate), `:100` (roles taken from body unchecked), `:216` (`isSuperUser = !usingCaps && roles.includes("owner")`), `:257` (service-role upsert).
- **What's wrong:** The route is gated only on `admin:manage_users` (held by `administrator`, `iam_admin`, or a per-user grant). It reads `roles` from the request body with no allowlist check against `ROLE_DEFS`, and if the body contains `"owner"` it sets `is_super_user: true` on the profile it creates with the service-role client, with a caller-chosen password. The sibling `/api/team/set-roles` route **does** allowlist roles and explicitly refuses `"owner"` (`set-roles/route.ts:28,90-100`), and `roles.ts:64` states administrators "cannot grant Owner / Super Administrator privileges" — this route simply omits that guard. The 0025/0026 column-guard trigger only fires `BEFORE UPDATE` for the `authenticated` role, so it does not cover this service-role INSERT.
- **Failure scenario:** An `iam_admin` (a role described as having "no access to financials or inventory") sends one authenticated API request to create an account with `roles: ["owner"]`. The resulting super-user bypasses every capability check in both the API (`requireUser` short-circuits for super-users) and RLS (`auth_has_any_capability` returns true for `is_super_user`), and is shielded from `set-roles`/`reset-password` because those refuse super-user targets — so other admins cannot even undo it.
- **Severity:** likelihood medium (needs an insider holding `admin:manage_users`, or chain with H2), impact high (escalation to unrestricted super-user). **Overall: high.** Confirmed.
- **Fix:** Validate `roles` against `ROLE_DEFS` and reject unknown values; refuse `"owner"` unless `actor.isSuperUser` (or always), computing `isSuperUser` only after that check. Apply the same allowlist + owner refusal in `send-invite` (`route.ts:76,125`), which also stores body roles unchecked.

### H2 — High: any active staff member can escalate to administrator through invite / join-link RLS

- **Where:** `db/migrations/0022_team_invitations.sql:47-54` and `db/migrations/0007_team_join_links.sql:41-48` (write policies), redeemed at `src/app/api/team/accept-join/route.ts:185,263,325`.
- **What's wrong:** The INSERT/UPDATE RLS policies on both invite tables check only `company_id = current_company_id()` — there is no `admin:manage_users` gate. No later migration tightens them (0033 explicitly leaves them unchanged), and nothing in the repo revokes the default PostgREST grants to the `authenticated` role (the app relies on those defaults elsewhere, e.g. `deal_notes`). The unauthenticated `/api/team/accept-join` route then grants the stored `default_roles` / `default_role` with the service role, with no allowlist. Because staff hold the publishable key and a session, they can write to these tables directly via PostgREST, bypassing the UI.
- **Failure scenario:** A `view_only` member writes an invitation row in their own company carrying `default_roles: ['administrator']` (or sets a join link's `default_role`), then redeems it, obtaining an active administrator account (user management, settings, financial dashboards, vendors, per-user permission grants). Chained with H1 that becomes super-user. A secondary effect of the same company-only SELECT policies: every member can read pending invite tokens and the shared join-link token, and the recipient binding is only a typed-email comparison (`email_confirm:true`, no mailbox proof), so a member could pre-empt a legitimately issued privileged invite.
- **Severity:** likelihood high among insiders (any active role, a direct PostgREST write), impact high (escalation to admin, fully bypassing the `admin:manage_users` control that `send-invite` enforces server-side). **Overall: high.** Confirmed. (`accept-join` hard-codes `is_super_user:false`, so this path alone reaches administrator/iam_admin; super-user needs the H1 chain.)
- **Fix:** In `accept-join`, validate stored roles against `ROLE_DEFS`, refuse `"owner"`, and cap shared-join-link roles at `view_only`. In the DB, add `auth_has_any_capability(ARRAY['admin:manage_users'])` to the write (and token-SELECT) policies on both tables — or, since only service-role routes write them now, `REVOKE` insert/update/delete from `authenticated`. Apply the same role allowlist in `send-invite`.

### M1 — Medium: ungated, unthrottled OpenAI / LLM spend routes

- **Where:** `src/app/api/photo/generate/route.ts:23` and `src/app/api/listing/generate-description/route.ts:78`.
- **What's wrong:** Both routes call `requireUser()` and then discard the actor — no `requireCapability`, no `rateLimit`, no budget — before calling the operator-paid OpenAI image API / LLM gateway. Any active staff account in any role (including `view_only` and `driver`, which hold neither `photos:process` nor any advert capability) can call them in a loop. `/api/photo/generate` forwards a free-form prompt (≤1000 chars) and is not called anywhere in the app (dead but reachable). `generate-description` builds its prompt from uncapped body fields.
- **Failure scenario:** A low-privilege staff account scripts repeated calls, running unbounded operator-billed image/text generation; arbitrary image prompts under the operator's OpenAI org also risk content-policy suspension of the key that the legitimate photo and description features share, which would break them for every tenant. No tenant data crosses a boundary.
- **Severity:** likelihood low-to-medium (any authenticated staff session, trivially scriptable, no edge throttle), impact medium (operator spend + availability of a shared key). **Overall: medium.** Confirmed.
- **Fix:** Delete the unused `/api/photo/generate` (or gate it like the others). In `generate-description`, keep the actor and call `requireAnyCapability(actor, ['advert:create','advert:edit'])`; add a per-user `rateLimit` and ideally a per-company daily budget in a shared store (the in-memory limiter in `src/lib/rate-limit.ts` is per-instance and not a hard quota); cap the `features` count/length. Stop echoing upstream error bodies to the browser (`generate-description:166`, `photo/generate:95`).

### M2 — Medium: company-only write policies let any member rewrite money and records (systemic; headline: `invoice_receipts`)

- **Where (one root cause, several tables):** `db/migrations/0039_invoice_receipts.sql:51-65` (payment receipts), `db/migrations/0015_external_invoices.sql:85-107,158-174` (inbound invoices + their storage objects); the same pattern in `0038_pipeline_stages.sql`, `0042_inspection_checklist_items.sql`, `0010_vehicle_locations.sql`, `0043_deal_notes.sql` (those are F-L1/L2 below).
- **What's wrong:** Migration 0023/0024 added capability gates only to a fixed list of tables. Tables added afterwards copied a company-only RLS template with **no capability predicate and no author binding** (`recorded_by`/`created_by`/`user_id` come from the client). Since the browser writes to PostgREST directly with the publishable key, the UI's permission gates (and client-side `is_system` protection) are not a control. For `invoice_receipts` specifically, the app computes "Paid in full" / balance due from these rows and flips an invoice to paid when a receipt clears the balance.
- **Failure scenario:** A member (including `view_only`) with a direct PostgREST call adds a receipt under a finance colleague's name so an invoice shows settled, or deletes genuine receipts so a settled invoice shows money owed; and fabricates, alters or deletes inbound auction/workshop invoices and their PDF/image evidence with forged authorship. Effects stay within the attacker's own company. No money moves and nothing crosses tenants (`current_company_id()` is active- and company-scoped).
- **Severity:** likelihood medium (any active member, one request), impact medium (integrity and attribution of the payment ledger and supplier-cost evidence, one tenant). **Overall: medium.** Confirmed.
- **Fix:** In a migration, gate the write policies with `auth_has_any_capability(...)` matching the UI (`invoice:mark_paid`/`invoice:edit` for receipts; `external_invoice:create`/`edit_any`/`delete` for external invoices and their storage objects), bind `recorded_by`/`created_by = (SELECT auth.uid())`, and bind child rows to the parent's company. Drop the UPDATE policy on `invoice_receipts` to make the ledger append-only (no app path updates it). Gate the UI panels too, for defence in depth. Treat the other tables below as instances of the same fix.

### L1 — Low: configuration catalogues writable by any member (`pipeline_stages`, `inspection_checklist_items`, `lead_channels`)

- **Where:** `db/migrations/0038_pipeline_stages.sql:88-102`, `0042_inspection_checklist_items.sql:76-90`, `0014_lead_channels_rls.sql:22-36`; UI gate only at `src/app/(dashboard)/admin/settings/page.tsx:63`.
- **What's wrong / scenario:** Company-only write policies, gated in the UI on `admin:manage_settings`. A member can set a pipeline stage's `behaviour` to `won`/`reserved`/`lost` or delete a system stage; the next time a user who *can* write vehicles moves a deal into that stage, the app stamps the vehicle sold/reserved and the listing sold under that user's session (`src/lib/services/sales-service.ts:187,213-251`). Deleting a lead channel nulls `lead_channel_id` on every lead that used it (FK `ON DELETE SET NULL`). The downstream vehicle/listing effects are reversible and need a privileged colleague to act.
- **Severity:** overall **low**. Confirmed. **Fix:** add `auth_has_any_capability(ARRAY['admin:manage_settings'])` (or `channels:configure` for lead channels) to the write policies, and `AND NOT is_system` to the delete policies.

### L2 — Low: location history and deal notes can be rewritten, deleted or forged

- **Where:** `db/migrations/0010_vehicle_locations.sql:116-138` (documented append-only audit at `:97-100`), `0043_deal_notes.sql:18-28` (`FOR ALL`, no `user_id` binding).
- **What's wrong / scenario:** Company-only writes with client-supplied authorship. A member can post notes as a colleague, edit/delete anyone's notes, and alter or erase vehicle movement history — which `syncVehicleLocation` later re-derives the car's current location from. Direct PostgREST writes also skip the client-side `activity_log` entry, so they leave no app audit trail. Secondary records, one tenant, no money.
- **Severity:** overall **low**. Confirmed. **Fix:** bind authorship to `auth.uid()` and capability-gate (`locations:move`/`edit_history`/`delete`); make `deal_notes` SELECT+INSERT only with `user_id = auth.uid()`.

### L3 — Low: 0023 write unions ignore column scope (driver can edit costs; sales specialist can mark invoices paid)

- **Where:** `db/migrations/0023_rls_capability_hardening.sql:191-196` (`vehicles_update`), `:271-276` (`invoices_update`), `0024:70-78` (`invoice_payments`).
- **What's wrong / scenario:** The gates are a union of every capability that touches the table and are row-level, with no column guard. `vehicles_update` admits `inventory:add` (the `driver` role's only capability), so a driver can change any column, including buying/selling/listing price, status and the stored margin totals the UI reserves for `inventory:edit_costs`. `invoices_update`/`invoice_payments` admit `invoice:generate`, so a `sales_specialist` ("cannot send invoices or mark them paid") can set `status='paid'` or edit issued amounts. Column over-reach on rows these roles already write, one tenant.
- **Severity:** overall **low**. Confirmed. **Fix:** add `BEFORE UPDATE` column-guard triggers shaped like `0025` — guard the *source* cost/price columns with `inventory:edit_costs` and derive totals in the DB (don't guard the derived columns, which `vehicleService.recomputeValueAddition` rewrites under workshop/inspector sessions), and require `invoice:mark_paid`/`invoice:send`/`invoice:edit` for the matching invoice transitions.

### L4 — Low: post-login open redirect via a control character in `?next=`

- **Where:** `src/app/(auth)/login/page.tsx:50-52` (guard), `:94` (redirect).
- **What's wrong / scenario:** The guard `/^\/(?![/\\])/` only inspects the second character, so a value whose second character is a tab/LF/CR followed by `/host` passes. Next's router resolves it with `new URL()`, which strips the control character, producing a protocol-relative off-origin URL and a hard off-site navigation after a genuine sign-in. A staff member who follows a crafted link to the real login page and signs in is sent to an attacker page (a convincing "session expired, re-enter password" phish). No token leaves the origin; Next blocks `javascript:` URLs.
- **Severity:** overall **low**. Confirmed. **Fix:** reject control characters and backslashes, then parse with `new URL(raw, window.location.origin)` and accept only when the origin matches, redirecting to `pathname+search+hash`.

### L5 — Low: invoice-draft customer PII in localStorage is not scoped to the user

- **Where:** `src/app/(dashboard)/sales/invoice-generation/page.tsx:349-351` (key), `:487` (autosave), restore at `:404-406`.
- **What's wrong / scenario:** The page autosaves buyer name/address/postcode/phone/email to `localStorage` every 10s under a key scoped only by company + invoice/vehicle id (or `'new'`), not by user. Sign-out clears only the in-memory cache (`src/contexts/auth-context.tsx:343`), so the draft survives. On a shared forecourt machine, the next same-company user who opens the page gets the previous user's unsaved buyer PII restored into their form (and anyone with the device can read it from storage). The sibling leads page keys drafts per user for exactly this reason (`sales/leads/page.tsx:243`).
- **Severity:** overall **low**. Confirmed. **Fix:** add `user.id` to the key, and clear `cc-*-draft:*` keys on sign-in and sign-out.

---

## Needs validation (source-grounded, blocked on a fact outside the repo)

These are **not** confirmed findings and carry no final severity. Each names the decisive unknown and a safe, read-only owner check. **Do not test any of them against production.**

### NV1 — Committed production owner-account passwords + no MFA (critical if the password was never rotated)

- **Evidence:** Plaintext passwords for the production owner/super-user account (`abbas@carcapital.uk`) are tracked at HEAD — the shared UAT password in `docs/UAT-role-based-access.md:10,19` and as the dev-only hint literal in `src/app/(auth)/login/page.tsx:171`, and an older demo password in `docs/UAT-WARRANTIES.md:13`. History shows a seed script reset existing production accounts (incl. the owner) to the shared value, the demo password was shown ungated on `/login` from 2026-05-13 to 2026-06-01, and migration `0046_wipe_demo_data.sql` kept only the owner account. No MFA/`aal` check exists anywhere in source (`two_step_enabled` is display-only).
- **Blockers:** whether the owner password was rotated after 2026-05-31; whether the GitHub repo is private and who can read it; live Supabase MFA config.
- **If unrotated:** anyone who can read the repo (or saw the old login page) could sign in as super-user — unauthenticated takeover of the production tenant, i.e. **critical**.
- **Owner check:** in the Supabase dashboard, check the Auth audit log for a password-change event on the owner id after 2026-05-31 and recent sign-ins; check GitHub repo visibility/collaborators. **Rotate the owner password and revoke its sessions regardless**, remove the literals from the docs and the login page, enrol MFA for owners/super-users, and drop the `wipe_backup_20260826` schema (it holds an `auth.users` copy). This was the only candidate the parent raised about secrets; no real API key or token is committed anywhere (see "found sound").

### NV2 — `set_user_permissions` RPC body not in the repo (high if `SECURITY DEFINER` without caller checks)

- **Evidence:** `src/lib/services/permission-service.ts:91` calls `rpc('set_user_permissions', {p_user_id, p_capabilities, p_granted_by})` from the browser with a caller-supplied `p_granted_by`. The function is in the generated types (`database.types.ts:3029`) but defined in no migration or git history, and it predates migration 0023. Explicit `user_permissions` grants feed every capability gate.
- **If `SECURITY DEFINER` with no internal checks:** any member (possibly anon) could grant themselves any capability — self-escalation to admin capabilities.
- **Owner check:** `select prosecdef, proacl, pg_get_functiondef(oid) from pg_proc where proname='set_user_permissions'`. If `prosecdef` is true with no capability/company/self checks, treat as high; if `SECURITY INVOKER`, the 0024 `user_permissions` policies govern it and it is safe. **Fix if needed:** make it `SECURITY INVOKER`, or add `admin:manage_permissions` + same-company + not-self checks at the top, ignore `p_granted_by` in favour of `auth.uid()`, and `REVOKE EXECUTE FROM public, anon`.

### NV3 — `companies` UPDATE policy not in the repo (medium if it admits non-settings roles)

- **Evidence:** `next_cc_invoice_number` (`0008:100-113`) is `SECURITY INVOKER` and updates `companies`, and `invoiceService.create` calls it from the browser for every sale invoice (`invoice:generate` holders such as `sales_specialist`). For that to work the live `companies` UPDATE policy must admit those roles, and a row-level policy cannot restrict columns — so they could also edit the legal name, address, VAT number, logo and stock-ID prefix printed on invoices, or rewind the invoice sequence. `next_stock_seq` (body not in repo) is called on vehicle create by `inventory:add` holders.
- **Owner check:** `select policyname, cmd, qual from pg_policies where tablename='companies'` and `select proname, prosecdef from pg_proc where proname in ('next_cc_invoice_number','next_stock_seq')`. **Fix if needed:** gate `companies` UPDATE on `admin:manage_settings`; move sequence increments into `SECURITY DEFINER` functions that check `p_company_id = current_company_id()` and touch only the counter.

### NV4 — `vendors` / `dealer_partners` RLS not in the repo (the recent delete feature relies on it)

- **Evidence:** `vendorService.remove` and `dealerPartnerService.remove` delete from the browser assuming "RLS turns a forbidden delete into 0 rows", but no migration creates policies for either table (`0002:35-42` leaves `dealer_partners` RLS commented out; 0023 adds no gate). `0003:9-11`/`0007:11-13` describe the pattern as company-only, and the vendors admin page has no capability check before upsert/remove (`admin/vendors/page.tsx:294,317,722`). This is the surface the recent `6467ad4`/`00df8c8` vendor/partner-deletion work introduced.
- **Owner check:** `select relrowsecurity from pg_class where relname in ('vendors','dealer_partners')` and `select policyname, cmd, qual from pg_policies where tablename in ('vendors','dealer_partners')`. If company-only, this is **low** (directory data; deletes bounded by FK `RESTRICT`) and shares M2's fix. If RLS is **off** on `dealer_partners`, it is higher — unauthenticated cross-tenant read/write of partner data. **Fix:** set explicit policies — SELECT company-scoped; UPDATE/DELETE gated on `admin:manage_vendors`; INSERT on `admin:manage_vendors` or `external_invoice:create` for vendors (to keep the inline-add working); ensure RLS is enabled on `dealer_partners`.

### NV5 — `/api/photo/vehicle` reads the vehicle as `anon` and trusts the row's company id

- **Evidence:** `src/app/api/photo/vehicle/route.ts:87` discards the actor and reads the vehicle through the browser-client module (`:160`), which runs as the `anon` role on the server (empty cookie store → publishable-key bearer), then uses the row's `company_id` for service-role storage writes (`:167`, `src/lib/services/photo-storage.ts:57`). No `photos:process` check.
- **Decides between two outcomes:** if the live `vehicles` SELECT policy denies `anon` (as `0023` implies — `current_company_id()` is NULL for anon), every call 404s and it is a **functional bug** with no security impact; if any live policy passes for `anon`, the `vehicles` table is readable by the unauthenticated internet **and** any staff member could write AI images into another tenant's storage prefix.
- **Owner check:** `select policyname, roles, cmd, qual from pg_policies where tablename='vehicles'` and `select has_table_privilege('anon','public.vehicles','select')`. **Fix regardless:** keep the actor, require `photos:process`, read the vehicle with the admin client filtered by `id AND company_id = actor.companyId`, use `actor.companyId` for the path, and make `@/lib/supabase/client` throw on the server so route code can never silently run as anon.

### NV6 — Lookup rate-limit scope vs. shared daily upstream quota

- **Evidence:** `/api/vehicle/lookup` and `/api/dvla/lookup` (any role) share a per-user, per-instance, in-memory 30/min limiter; the code's own comments put the DVLA free tier at 1,000/day. `force:true` and varying the mileage/registration defeat the cache; an AutoTrader 429 sets a process-wide pause. There is no daily/global/per-company budget.
- **Blockers:** the real DVLA/DVSA/AutoTrader quotas and any Vercel Firewall rate rules — all outside source.
- **Owner check:** read the DVLA/AutoTrader usage dashboards and Vercel Firewall rules; grep function logs for `dvla_rate_limited`. **Fix:** add a shared-store daily budget (per company + global) before the upstream fan-out, require `inventory:add`/`inventory:edit`, and restrict `force`.

### NV7 — Backfill snapshot tables created without explicit RLS

- **Evidence:** `0045_backfill_vehicle_cost_totals.sql:46-54` and `0049_vehicle_images_count_trigger.sql:59-61` create public-schema snapshot tables with `CREATE TABLE AS` and no `ENABLE ROW LEVEL SECURITY` (unlike `0050`/`0051`, which do). The 0045 table is present in the generated types after the wipe.
- **Owner check:** `select relname, relrowsecurity from pg_class where relname like 'vehicle_%backfill%'` and `has_table_privilege('anon', …,'select')`. If RLS is off and `anon` has privileges, this is **low** — unauthenticated read of (pre-wipe, non-genuine) cost figures and registrations. **Fix:** enable RLS and revoke API-role grants on both, or drop them; keep future snapshots in a non-exposed schema.

---

## What was checked and found sound

- **Proxy / page auth:** the proxy gates pages on `getClaims()` (JWT signature verified via project JWKS, with a server `getUser()` fallback for HS* tokens); cookie presence is only a fail-closed fast path; `PUBLIC_PATHS` uses exact/`${p}/` matching so prefix tricks fail; there are no Server Actions, and `getInitialAuth` uses server-verified `getUser()`. (The page path is sound; the *API* path is C1.)
- **Capability model:** `auth_has_any_capability()` and `current_company_id()` are `SECURITY DEFINER` with `search_path ''`, evaluate only `auth.uid()`, and return NULL for inactive users; the SQL `role_capabilities` map is a subset of `roles.ts` (only `advertiser:*` differs, and that table is service-role only, so it fails closed); capabilities are recomputed from the DB per request; the `0025`/`0026` trigger blocks self-edits of `roles`, `role`, `is_super_user`, `active`, `company_id`, `username`, `email`.
- **Webhook / cron:** the AutoTrader webhook verifies HMAC-SHA256 over the raw body with `timingSafeEqual` and fails closed when the secret is unset; the cron route fails closed on an unset `CRON_SECRET`. The webhook's only sink is an idempotent upsert of an integration-global row.
- **Injection / XSS:** no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `child_process`, `vm`, `postMessage` or HTML/markdown renderer anywhere in `src`; LLM output and user fields render through React escaping; PDFs use `@react-pdf` primitives; email templates escape every interpolation including `href`; the credentials email omits the password.
- **SSRF / outbound:** registration input is allowlisted (`^[A-Z0-9]{1,8}$`) before any outbound call, which goes to constant hosts; LLM endpoint/key come from env only.
- **Secrets / supply chain:** no real API key, token, JWT, private key or service-role key in any tracked file or in 427 commits of history (only placeholders); `.env*` never committed; every secret-bearing module imports `server-only`; only `NODE_ENV` is read in client files; `pnpm-lock.yaml` has integrity for every package with no git/tarball sources, CI uses `--frozen-lockfile`, and pnpm 10 blocks dependency build scripts; CI uses `pull_request` (not `pull_request_target`) and runs gitleaks on PRs. No advisory could be confirmed offline against the pinned versions (`next@16.2.4`, `@supabase/ssr@0.10.3`, etc.) — see "could not be checked".
- **Tenant isolation (verified sound):** notifications are own-user + own-company with no browser INSERT/DELETE; realtime adds only the notifications table and RLS bounds the client-supplied filter; the browser backup/export runs under the user's own RLS, so export scope cannot exceed direct read scope; the private `external-invoices` bucket scopes every storage policy by `company_id`; the invoice/inspection child tables bind tenancy through the parent row and capability-gate writes; `SECURITY DEFINER` trigger functions only write recomputed values and cannot carry attacker-chosen values across RLS.

---

## Coverage limits — areas the skill covers that could not be fully checked

This was a **single-wave quick-profile, source-only** run (the skill notes one run typically finds about half of what repeated runs find), so coverage is partial by design. Specific gaps:

- **No execution evidence.** No OS sandbox and no local Supabase on this host, so nothing was run; findings rest on source review and installed dependency source, not on observed behaviour.
- **Base-schema RLS is not in the repository.** `db/migrations` starts at 0001 and only adds/changes some tables; the base policies for core tables (`users`, `companies`, `vehicles`, `customers`, `enquiries`, `activity_log`, storage buckets, etc.) and the default role grants are a live-DB fact. This is the root of NV2–NV5 and of the coverage-critic gaps below. Several confirmed findings (H2, M2) note where a conclusion holds given the repo's stated company-only pattern but would need `pg_policies` to be certain.
- **Dependency advisories after the knowledge cutoff** can't be checked offline — run `pnpm audit --prod` and `pnpm audit` (network required).
- **Deployment state not in the repo:** Vercel env scoping for Preview deployments, Firewall/WAF rules, platform response headers, the image-optimizer plan, and Supabase Auth settings (public sign-up on/off, MFA).
- **Coverage-critic deferred leads** (recorded, not hunted, per the quick profile):
  1. **Public sign-up → self-provisioned profile.** The app only creates users via the admin API, but nothing in the repo shows GoTrue public sign-up is off, the `users` INSERT policy is base-schema, and the guard trigger is `BEFORE UPDATE` only. If sign-up is on and a permissive `users` INSERT policy exists, an outsider could self-provision a privileged profile. *Owner check:* Auth "allow new users to sign up" setting; `pg_policies` for `public.users` INSERT.
  2. **Read-side capability drift.** `admin:view_financials`/`view_master_sheet` are enforced only in the UI while SELECT stays company-scoped, yet `iam_admin`/`aftercare` role contracts withhold financial/master-sheet data. No unit checked read-side enforcement against the role contracts.
  3. **Base write-policy survival.** 0023/0024 drop policies by assumed name; a surviving base permissive policy under another name would cancel a capability gate (Postgres ORs permissive policies). *Owner check:* `pg_policies` per gated table.
  4. **Join-link token entropy.** `team_join_links.token` has no DB default or format constraint and no writer in `src`, so the entropy of live tokens (relevant to brute-force against the unauthenticated `accept-join`) can't be judged from source.
- **Not reviewed:** Server Components / server code that import `src/lib/services/*` (which run as `anon` on the server through a process-wide cache) beyond the one API route where it surfaced (NV5); the master-sheet import path; PDF generation inputs in depth.

---

## Top 3 to fix first

1. **C1 — remove the `getSession()` fallback in `requireUser()`** (`src/lib/auth/require-user.ts:76-87`). It is the only *unauthenticated* path to full account impersonation on the admin API, the fix is a few lines, and `getUser()` already covers the case the fallback was added for.
2. **H2 + H1 — close the two staff→admin→super-user escalation paths.** Capability-gate (or revoke) the `team_invitations`/`team_join_links` write policies and add a role allowlist in `accept-join` (H2), and allowlist roles + refuse `"owner"` in `create-with-password` and `send-invite` (H1). Together they let an ordinary staff account reach super-user.
3. **NV1 — rotate the production owner password now and confirm MFA.** It is "needs validation" only because rotation status isn't in the repo, but the committed passwords are real and the check + rotation is cheap; left unrotated it is an unauthenticated super-user takeover. Rotate, revoke sessions, strip the literals from docs and the login page, and enrol MFA for owners.

*(The systemic M2 company-only-write pattern is the highest-value cleanup after the top 3: one migration adding capability predicates + author binding closes M2, L1, L2, and — pending NV4 — the vendor/partner delete surface.)*
