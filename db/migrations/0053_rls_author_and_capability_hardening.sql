-- ============================================================================
-- Migration 0053 — RLS author-binding + capability hardening (security audit)
-- ============================================================================
--
-- Follows the 2026-10-26 security audit (docs/security-audit-2026-10-26.md).
-- Migration 0023 capability-gated the WRITE policies of the core transactional
-- tables, but tables added afterwards copied a company-only RLS template with
-- no capability predicate and no author binding. Because the browser talks to
-- PostgREST directly (publishable key + the user's session), the UI permission
-- gates are NOT a control for those tables — any active member can bypass them
-- with a direct request. This migration closes that gap, mirroring the shape of
-- 0023/0024 (company match + public.auth_has_any_capability(...)) and 0025 (a
-- BEFORE-UPDATE column guard scoped to the `authenticated` role).
--
-- Findings addressed: H2 (team invite / join-link writes), M2 (invoice_receipts
-- + external_invoices), L1 (settings catalogues), L2 (location history + deal
-- notes), L3 (column over-reach on vehicles / invoices), and the code-side-plus-
-- DB parts of NV4 (vendors / dealer_partners) and NV7 (backfill snapshots).
--
-- Idempotent (DROP POLICY IF EXISTS / CREATE OR REPLACE throughout). The
-- service-role key still BYPASSES RLS, so the /api/* admin routes are
-- unaffected; these policies govern the browser anon client.
--
-- ⚠ Apply and smoke-test on a NON-PRODUCTION Supabase branch first. RLS and
--   the two BEFORE-UPDATE triggers change write behaviour for every role, and
--   some base-schema policies are not in this repo (see §8 and the audit's
--   needs-validation items) — confirm no pre-existing permissive policy on the
--   same tables cancels these gates before applying to production.
-- ----------------------------------------------------------------------------

BEGIN;

-- ============================================================================
-- 1. Team invitations + join links (H2) — writing these rows grants roles, so
--    gate them on admin:manage_users. The browser no longer manages either
--    table (send-invite / reset use the service role), so SELECT of the tokens
--    is also restricted to user managers.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS team_invitations_select ON public.team_invitations;
CREATE POLICY team_invitations_select ON public.team_invitations FOR SELECT
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']));
DROP POLICY IF EXISTS team_invitations_insert ON public.team_invitations;
CREATE POLICY team_invitations_insert ON public.team_invitations FOR INSERT
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']));
DROP POLICY IF EXISTS team_invitations_update ON public.team_invitations;
CREATE POLICY team_invitations_update ON public.team_invitations FOR UPDATE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']))
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']));
DROP POLICY IF EXISTS team_invitations_delete ON public.team_invitations;
CREATE POLICY team_invitations_delete ON public.team_invitations FOR DELETE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']));

DROP POLICY IF EXISTS team_join_links_select ON public.team_join_links;
CREATE POLICY team_join_links_select ON public.team_join_links FOR SELECT
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']));
DROP POLICY IF EXISTS team_join_links_insert ON public.team_join_links;
CREATE POLICY team_join_links_insert ON public.team_join_links FOR INSERT
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']));
DROP POLICY IF EXISTS team_join_links_update ON public.team_join_links;
CREATE POLICY team_join_links_update ON public.team_join_links FOR UPDATE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']))
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']));
DROP POLICY IF EXISTS team_join_links_delete ON public.team_join_links;
CREATE POLICY team_join_links_delete ON public.team_join_links FOR DELETE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_users']));

-- ============================================================================
-- 2. invoice_receipts (M2) — the payment ledger that drives "Paid in full".
--    Writes need an invoice capability; INSERT binds recorded_by to the caller
--    and the receipt to an invoice in the same company; the ledger is
--    append-only (no UPDATE policy). SELECT stays company-scoped (unchanged).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS invoice_receipts_insert ON public.invoice_receipts;
CREATE POLICY invoice_receipts_insert ON public.invoice_receipts FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id()
    AND recorded_by = (SELECT auth.uid())
    AND public.auth_has_any_capability(ARRAY['invoice:mark_paid','invoice:edit'])
    AND EXISTS (SELECT 1 FROM public.invoices i
                 WHERE i.id = invoice_receipts.invoice_id
                   AND i.company_id = public.current_company_id())
  );
-- Append-only: drop the UPDATE policy so receipts cannot be edited after the
-- fact (no app path updates them; a correction is a new receipt).
DROP POLICY IF EXISTS invoice_receipts_update ON public.invoice_receipts;
DROP POLICY IF EXISTS invoice_receipts_delete ON public.invoice_receipts;
CREATE POLICY invoice_receipts_delete ON public.invoice_receipts FOR DELETE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['invoice:mark_paid','invoice:edit']));

-- ============================================================================
-- 3. external_invoices (M2) + its storage objects — inbound auction/workshop
--    invoices and their attachment files. Gate on the external_invoice caps and
--    bind created_by on INSERT; edit is own-row (with :create) or :edit_any.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS external_invoices_insert ON public.external_invoices;
CREATE POLICY external_invoices_insert ON public.external_invoices FOR INSERT
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.auth_has_any_capability(ARRAY['external_invoice:create'])
    AND EXISTS (SELECT 1 FROM public.vehicles v
                 WHERE v.id = external_invoices.vehicle_id
                   AND v.company_id = public.current_company_id())
  );
DROP POLICY IF EXISTS external_invoices_update ON public.external_invoices;
CREATE POLICY external_invoices_update ON public.external_invoices FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.vehicles v
             WHERE v.id = external_invoices.vehicle_id
               AND v.company_id = public.current_company_id())
    AND (public.auth_has_any_capability(ARRAY['external_invoice:edit_any'])
         OR (created_by = (SELECT auth.uid())
             AND public.auth_has_any_capability(ARRAY['external_invoice:create'])))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vehicles v
             WHERE v.id = external_invoices.vehicle_id
               AND v.company_id = public.current_company_id())
    AND (public.auth_has_any_capability(ARRAY['external_invoice:edit_any'])
         OR (created_by = (SELECT auth.uid())
             AND public.auth_has_any_capability(ARRAY['external_invoice:create'])))
  );
DROP POLICY IF EXISTS external_invoices_delete ON public.external_invoices;
CREATE POLICY external_invoices_delete ON public.external_invoices FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.vehicles v
             WHERE v.id = external_invoices.vehicle_id
               AND v.company_id = public.current_company_id())
    AND public.auth_has_any_capability(ARRAY['external_invoice:delete'])
  );

-- Storage objects for the private external-invoices bucket. Writes need a
-- write capability; the delete capability set includes create/edit_any because
-- editing an attachment purges the replaced object. SELECT unchanged.
DROP POLICY IF EXISTS external_invoices_storage_insert ON storage.objects;
CREATE POLICY external_invoices_storage_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'external-invoices'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND public.auth_has_any_capability(ARRAY['external_invoice:create','external_invoice:edit_any']));
DROP POLICY IF EXISTS external_invoices_storage_update ON storage.objects;
CREATE POLICY external_invoices_storage_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'external-invoices'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND public.auth_has_any_capability(ARRAY['external_invoice:create','external_invoice:edit_any']));
DROP POLICY IF EXISTS external_invoices_storage_delete ON storage.objects;
CREATE POLICY external_invoices_storage_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'external-invoices'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND public.auth_has_any_capability(ARRAY['external_invoice:create','external_invoice:edit_any','external_invoice:delete']));

-- ============================================================================
-- 4. Settings catalogues (L1) — pipeline stages, inspection checklist, lead
--    channels. Writing these changes behaviour the app automates, so gate on
--    admin:manage_settings (plus channels:configure for lead channels), and
--    forbid deleting system rows where an is_system column exists.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS pipeline_stages_insert ON public.pipeline_stages;
CREATE POLICY pipeline_stages_insert ON public.pipeline_stages FOR INSERT
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings']));
DROP POLICY IF EXISTS pipeline_stages_update ON public.pipeline_stages;
CREATE POLICY pipeline_stages_update ON public.pipeline_stages FOR UPDATE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings']))
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings']));
DROP POLICY IF EXISTS pipeline_stages_delete ON public.pipeline_stages;
CREATE POLICY pipeline_stages_delete ON public.pipeline_stages FOR DELETE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings'])
    AND is_system = false);

DROP POLICY IF EXISTS inspection_checklist_items_insert ON public.inspection_checklist_items;
CREATE POLICY inspection_checklist_items_insert ON public.inspection_checklist_items FOR INSERT
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings']));
DROP POLICY IF EXISTS inspection_checklist_items_update ON public.inspection_checklist_items;
CREATE POLICY inspection_checklist_items_update ON public.inspection_checklist_items FOR UPDATE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings']))
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings']));
DROP POLICY IF EXISTS inspection_checklist_items_delete ON public.inspection_checklist_items;
CREATE POLICY inspection_checklist_items_delete ON public.inspection_checklist_items FOR DELETE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings']));

DROP POLICY IF EXISTS lead_channels_insert ON public.lead_channels;
CREATE POLICY lead_channels_insert ON public.lead_channels FOR INSERT
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings','channels:configure']));
DROP POLICY IF EXISTS lead_channels_update ON public.lead_channels;
CREATE POLICY lead_channels_update ON public.lead_channels FOR UPDATE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings','channels:configure']))
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings','channels:configure']));
DROP POLICY IF EXISTS lead_channels_delete ON public.lead_channels;
CREATE POLICY lead_channels_delete ON public.lead_channels FOR DELETE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_settings','channels:configure'])
    AND is_system = false);

-- ============================================================================
-- 5. History tables (L2) — location movements (documented append-only audit)
--    and deal notes. Bind authorship to the caller and capability-gate writes.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS location_movements_insert ON public.location_movements;
CREATE POLICY location_movements_insert ON public.location_movements FOR INSERT
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.auth_has_any_capability(ARRAY['locations:move'])
    AND EXISTS (SELECT 1 FROM public.vehicles v
                 WHERE v.id = location_movements.vehicle_id
                   AND v.company_id = public.current_company_id())
  );
DROP POLICY IF EXISTS location_movements_update ON public.location_movements;
CREATE POLICY location_movements_update ON public.location_movements FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.vehicles v
             WHERE v.id = location_movements.vehicle_id
               AND v.company_id = public.current_company_id())
    AND public.auth_has_any_capability(ARRAY['locations:edit_history'])
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vehicles v
             WHERE v.id = location_movements.vehicle_id
               AND v.company_id = public.current_company_id())
    AND public.auth_has_any_capability(ARRAY['locations:edit_history'])
  );
DROP POLICY IF EXISTS location_movements_delete ON public.location_movements;
CREATE POLICY location_movements_delete ON public.location_movements FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.vehicles v
             WHERE v.id = location_movements.vehicle_id
               AND v.company_id = public.current_company_id())
    AND public.auth_has_any_capability(ARRAY['locations:delete'])
  );

-- deal_notes: the app only reads and adds notes, so replace the FOR ALL policy
-- with a company-scoped SELECT and an INSERT that binds user_id (no UPDATE /
-- DELETE policy → those are denied by default).
DROP POLICY IF EXISTS deal_notes_all ON public.deal_notes;
DROP POLICY IF EXISTS deal_notes_select ON public.deal_notes;
CREATE POLICY deal_notes_select ON public.deal_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sales_deals d
                  WHERE d.id = deal_notes.deal_id
                    AND d.company_id = public.current_company_id()));
DROP POLICY IF EXISTS deal_notes_insert ON public.deal_notes;
CREATE POLICY deal_notes_insert ON public.deal_notes FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.sales_deals d
                 WHERE d.id = deal_notes.deal_id
                   AND d.company_id = public.current_company_id())
  );

-- ============================================================================
-- 6. Column over-reach (L3) — BEFORE-UPDATE guards shaped like 0025's
--    guard_user_privileged_columns. They restrict only the `authenticated`
--    (browser) role; the service role and internal contexts are unaffected.
-- ----------------------------------------------------------------------------

-- 6a. vehicles: only inventory:edit_costs may change the source cost/price
--     columns. The DERIVED totals (total_buying_price, landed_cost, base_cost,
--     gross_earning, value_addition) are deliberately NOT guarded — the
--     value-addition recompute writes them under workshop/inspector sessions
--     that legitimately lack inventory:edit_costs.
CREATE OR REPLACE FUNCTION public.guard_vehicle_cost_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND NOT public.auth_has_any_capability(ARRAY['inventory:edit_costs']) THEN
    IF NEW.buying_price            IS DISTINCT FROM OLD.buying_price
       OR NEW.selling_price        IS DISTINCT FROM OLD.selling_price
       OR NEW.listing_price        IS DISTINCT FROM OLD.listing_price
       OR NEW.minimum_sale_price   IS DISTINCT FROM OLD.minimum_sale_price
       OR NEW.vat_on_buying_price  IS DISTINCT FROM OLD.vat_on_buying_price
       OR NEW.stocking_charges     IS DISTINCT FROM OLD.stocking_charges
       OR NEW.buyers_fee           IS DISTINCT FROM OLD.buyers_fee
       OR NEW.collection_fee       IS DISTINCT FROM OLD.collection_fee
       OR NEW.delivery_fee         IS DISTINCT FROM OLD.delivery_fee
       OR NEW.inspection_charge    IS DISTINCT FROM OLD.inspection_charge
       OR NEW.late_storage_fee     IS DISTINCT FROM OLD.late_storage_fee
       OR NEW.loading_fee          IS DISTINCT FROM OLD.loading_fee
       OR NEW.other_charges        IS DISTINCT FROM OLD.other_charges
       OR NEW.unloading_fee        IS DISTINCT FROM OLD.unloading_fee
       OR NEW.warranty_cost        IS DISTINCT FROM OLD.warranty_cost
       OR NEW.daily_charge_rate    IS DISTINCT FROM OLD.daily_charge_rate
       OR NEW.battery_report_fee   IS DISTINCT FROM OLD.battery_report_fee
       OR NEW.customer_delivery_cost   IS DISTINCT FROM OLD.customer_delivery_cost
       OR NEW.ev_assured_charge        IS DISTINCT FROM OLD.ev_assured_charge
       OR NEW.extended_warranty_cost   IS DISTINCT FROM OLD.extended_warranty_cost
       OR NEW.finance_company_charges  IS DISTINCT FROM OLD.finance_company_charges
       OR NEW.insurance_cost           IS DISTINCT FROM OLD.insurance_cost
       OR NEW.other_jobs_cost          IS DISTINCT FROM OLD.other_jobs_cost
       OR NEW.road_tax_cost            IS DISTINCT FROM OLD.road_tax_cost
       OR NEW.vat_on_battery_report_fee IS DISTINCT FROM OLD.vat_on_battery_report_fee
       OR NEW.vat_on_buyers_fee         IS DISTINCT FROM OLD.vat_on_buyers_fee
       OR NEW.vat_on_collection_fee     IS DISTINCT FROM OLD.vat_on_collection_fee
       OR NEW.vat_on_delivery_fee       IS DISTINCT FROM OLD.vat_on_delivery_fee
       OR NEW.vat_on_ev_assured_charge  IS DISTINCT FROM OLD.vat_on_ev_assured_charge
       OR NEW.vat_on_inspection_charge  IS DISTINCT FROM OLD.vat_on_inspection_charge
       OR NEW.vat_on_late_storage_fee   IS DISTINCT FROM OLD.vat_on_late_storage_fee THEN
      RAISE EXCEPTION
        'Editing vehicle cost / price columns requires the Edit Costs permission'
        USING errcode = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_vehicle_cost_columns ON public.vehicles;
CREATE TRIGGER guard_vehicle_cost_columns
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_vehicle_cost_columns();

-- 6b. invoices: a browser caller needs invoice:mark_paid to move status to
--     'paid' and invoice:send to move it to 'sent'. Other transitions (draft /
--     issued) stay covered by the invoices_update capability union from 0023.
CREATE OR REPLACE FUNCTION public.guard_invoice_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid'
       AND NOT public.auth_has_any_capability(ARRAY['invoice:mark_paid']) THEN
      RAISE EXCEPTION 'Marking an invoice paid requires the Mark Invoice Paid permission'
        USING errcode = '42501';
    END IF;
    IF NEW.status = 'sent' AND OLD.status IS DISTINCT FROM 'sent'
       AND NOT public.auth_has_any_capability(ARRAY['invoice:send']) THEN
      RAISE EXCEPTION 'Sending an invoice requires the Send Invoice permission'
        USING errcode = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_invoice_status_transitions ON public.invoices;
CREATE TRIGGER guard_invoice_status_transitions
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_invoice_status_transitions();

-- ============================================================================
-- 7. Backfill snapshot tables (NV7) — created with CREATE TABLE AS and no
--    explicit RLS. Enable RLS (no policy → service-role only) and revoke the
--    default API-role grants, so the anon/authenticated keys cannot read them.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname ~ '^vehicle_(cost|images_count)_backfill_'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- ============================================================================
-- 8. vendors + dealer_partners (NV4) — the recent delete feature relies on RLS
--    that is not defined in this repo. Set explicit policies: SELECT is
--    company-scoped; writes need admin:manage_vendors (vendors INSERT also
--    allows external_invoice:create so the inline "Add vendor" on the
--    external-invoice form keeps working for inventory managers).
--
--    ⚠ If the live DB has a pre-existing permissive policy on either table
--      (e.g. a company-only FOR ALL policy under a name not in this repo),
--      Postgres ORs permissive policies together and these gates will NOT
--      restrict until that policy is dropped. Confirm with:
--        select policyname, cmd from pg_policies
--         where schemaname='public' and tablename in ('vendors','dealer_partners');
--      and drop any permissive policy that is not one of the ones below.
-- ----------------------------------------------------------------------------
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_partners ENABLE ROW LEVEL SECURITY;

-- Documented candidate base-policy names (from 0002's commented example / the
-- "company_rw" pattern) — dropped if present so they cannot cancel the gates.
DROP POLICY IF EXISTS vendors_company_rw ON public.vendors;
DROP POLICY IF EXISTS dealer_partners_company_rw ON public.dealer_partners;

DROP POLICY IF EXISTS vendors_select ON public.vendors;
CREATE POLICY vendors_select ON public.vendors FOR SELECT
  USING (company_id = public.current_company_id());
DROP POLICY IF EXISTS vendors_insert ON public.vendors;
CREATE POLICY vendors_insert ON public.vendors FOR INSERT
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_vendors','external_invoice:create']));
DROP POLICY IF EXISTS vendors_update ON public.vendors;
CREATE POLICY vendors_update ON public.vendors FOR UPDATE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_vendors']))
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_vendors']));
DROP POLICY IF EXISTS vendors_delete ON public.vendors;
CREATE POLICY vendors_delete ON public.vendors FOR DELETE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_vendors']));

DROP POLICY IF EXISTS dealer_partners_select ON public.dealer_partners;
CREATE POLICY dealer_partners_select ON public.dealer_partners FOR SELECT
  USING (company_id = public.current_company_id());
DROP POLICY IF EXISTS dealer_partners_insert ON public.dealer_partners;
CREATE POLICY dealer_partners_insert ON public.dealer_partners FOR INSERT
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_vendors']));
DROP POLICY IF EXISTS dealer_partners_update ON public.dealer_partners;
CREATE POLICY dealer_partners_update ON public.dealer_partners FOR UPDATE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_vendors']))
  WITH CHECK (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_vendors']));
DROP POLICY IF EXISTS dealer_partners_delete ON public.dealer_partners;
CREATE POLICY dealer_partners_delete ON public.dealer_partners FOR DELETE
  USING (company_id = public.current_company_id()
    AND public.auth_has_any_capability(ARRAY['admin:manage_vendors']));

COMMIT;

-- ============================================================================
-- End migration 0053
-- ============================================================================
