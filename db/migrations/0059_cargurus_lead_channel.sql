-- ============================================================================
-- Migration 0059 — CarGurus lead channel (bug list 2026-11-02, item 1)
-- ============================================================================
--
-- CarGurus was missing from the Lead channel dropdown on Create lead. Adds it
-- as a system channel for every company, straight after AutoTrader, shifting
-- the channels below it down one place.
--
-- Idempotent: a company that already has a `cargurus` row is left alone (its
-- label, order and enabled flag are whatever the admin set). Safe to re-run.
-- ----------------------------------------------------------------------------

-- 1. Make room after AutoTrader, only in companies that don't have CarGurus yet.
UPDATE public.lead_channels lc
   SET sort_order = lc.sort_order + 1,
       updated_at = now()
  FROM public.lead_channels at
 WHERE at.company_id = lc.company_id
   AND at.slug = 'autotrader'
   AND lc.sort_order > at.sort_order
   AND NOT EXISTS (
     SELECT 1 FROM public.lead_channels g
      WHERE g.company_id = lc.company_id AND g.slug = 'cargurus'
   );

-- 2. Add the channel (after AutoTrader, or last when a company has no AutoTrader row).
INSERT INTO public.lead_channels
  (company_id, slug, label, sort_order, enabled, is_system, colour)
SELECT c.id,
       'cargurus',
       'CarGurus',
       COALESCE(
         (SELECT at.sort_order + 1 FROM public.lead_channels at
           WHERE at.company_id = c.id AND at.slug = 'autotrader'),
         (SELECT COALESCE(MAX(x.sort_order), 0) + 1 FROM public.lead_channels x
           WHERE x.company_id = c.id)
       ),
       true,
       true,
       '#0891B2'
  FROM public.companies c
ON CONFLICT (company_id, slug) DO NOTHING;

-- ============================================================================
-- End migration 0059
-- ============================================================================
