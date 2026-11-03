-- ============================================================================
-- Migration 0060 — Viewing date on a deal (bug list 2026-11-02, item 4)
-- ============================================================================
--
-- The deal page now records the deal's particulars: agreed price, deposit,
-- balance due, viewing date and collection date. Every one already has a
-- column except the viewing date, added here.
--
-- The app reads this column on its own and treats an error as "no date", so
-- deploying the code before this runs leaves the field blank rather than
-- breaking the pipeline. Saving a viewing date needs it.
--
-- Idempotent. Safe to re-run.
-- ----------------------------------------------------------------------------

ALTER TABLE public.sales_deals
  ADD COLUMN IF NOT EXISTS viewing_date date;

COMMENT ON COLUMN public.sales_deals.viewing_date IS
  'The day the customer viewed (or is due to view) the car. Entered on the deal page.';

-- ============================================================================
-- End migration 0060
-- ============================================================================
