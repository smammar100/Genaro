-- Migration 0050 — Restructure the vehicle record around Car Capital's master sheet
-- ----------------------------------------------------------------------------
-- The client's own master sheet (DATA RAZA 24-08-2026.xlsx, columns A–BS) is the
-- source of truth for what a vehicle row holds. Column-by-column mapping, the
-- formulas and the reasoning live in docs/master-sheet-spec.md — read that
-- before touching any of the columns below.
--
-- 1. New columns for every sheet field the vehicles table did not hold yet.
-- 2. total_buying_price now follows the sheet: SUM(S:AH), i.e. the buying price
--    and six acquisition fees EACH WITH ITS OWN VAT LINE. other_charges moves
--    below it into landed_cost (it is not a sheet column).
-- 3. vat_on_buying_price used to be auto-filled with 20% of the buying price on
--    every car, whether or not VAT was paid. The sheet treats it as VAT actually
--    paid (filled on roughly half the rows). Rows still holding the auto-filled
--    figure are reset to 0, otherwise every car's total buying price would jump
--    by 20% of its price.
-- 4. value_addition becomes the roll-up of the car's Things to Do costs
--    (cancelled items excluded). Backfilled only for cars that have a costed
--    item, so a hand-entered figure on a car with no items is left alone.
-- 5. Stored totals re-derived with the new rule (mirrors src/lib/vehicle-costs.ts).
--
-- REVERSIBILITY: the pre-change values are snapshotted into
-- vehicle_master_sheet_backfill_0050 first. To roll back the figures:
--
--   UPDATE public.vehicles v
--   SET vat_on_buying_price = b.old_vat_on_buying_price,
--       value_addition      = b.old_value_addition,
--       total_buying_price  = b.old_total_buying_price,
--       landed_cost         = b.old_landed_cost,
--       base_cost           = b.old_base_cost,
--       gross_earning       = b.old_gross_earning
--   FROM public.vehicle_master_sheet_backfill_0050 b
--   WHERE v.id = b.id;
--
-- Idempotent: every ADD COLUMN is guarded, the snapshot is CREATE ... IF NOT
-- EXISTS, and the recompute is a pure function of the row.
-- ----------------------------------------------------------------------------

-- 1. New columns ---------------------------------------------------------------

ALTER TABLE public.vehicles
  -- Common
  ADD COLUMN IF NOT EXISTS legacy_serial_number      integer,
  -- Buying
  ADD COLUMN IF NOT EXISTS owner_details             text,
  ADD COLUMN IF NOT EXISTS credit_note_date          date,
  ADD COLUMN IF NOT EXISTS vat_on_buyers_fee         numeric,
  ADD COLUMN IF NOT EXISTS vat_on_inspection_charge  numeric,
  ADD COLUMN IF NOT EXISTS ev_assured_charge         numeric,
  ADD COLUMN IF NOT EXISTS vat_on_ev_assured_charge  numeric,
  ADD COLUMN IF NOT EXISTS battery_report_fee        numeric,
  ADD COLUMN IF NOT EXISTS vat_on_battery_report_fee numeric,
  ADD COLUMN IF NOT EXISTS vat_on_late_storage_fee   numeric,
  ADD COLUMN IF NOT EXISTS vat_on_collection_fee     numeric,
  ADD COLUMN IF NOT EXISTS vat_on_delivery_fee       numeric,
  -- Receiving
  ADD COLUMN IF NOT EXISTS log_book                  text,
  ADD COLUMN IF NOT EXISTS engine_size_kw            integer,
  ADD COLUMN IF NOT EXISTS num_seats                 integer,
  ADD COLUMN IF NOT EXISTS former_keepers            integer,
  ADD COLUMN IF NOT EXISTS mass_in_service           integer,
  ADD COLUMN IF NOT EXISTS engine_number             text,
  ADD COLUMN IF NOT EXISTS other_items_received      text,
  -- Sales data
  ADD COLUMN IF NOT EXISTS sale_status               text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS finance_company_deal      boolean,
  ADD COLUMN IF NOT EXISTS finance_company_charges   numeric,
  ADD COLUMN IF NOT EXISTS partner_share             numeric,
  ADD COLUMN IF NOT EXISTS extended_warranty_cost    numeric,
  ADD COLUMN IF NOT EXISTS road_tax_cost             numeric,
  ADD COLUMN IF NOT EXISTS insurance_cost            numeric,
  ADD COLUMN IF NOT EXISTS other_jobs_cost           numeric,
  ADD COLUMN IF NOT EXISTS customer_delivery_cost    numeric,
  ADD COLUMN IF NOT EXISTS remarks                   text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_sale_status_check'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_sale_status_check
      CHECK (sale_status IN ('available', 'sold', 'returned_to_owner', 'duplicate_entry'));
  END IF;
END $$;

-- One legacy serial per company: the importer relies on it to stay re-runnable.
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_company_legacy_serial_key
  ON public.vehicles (company_id, legacy_serial_number)
  WHERE legacy_serial_number IS NOT NULL;

COMMENT ON COLUMN public.vehicles.legacy_serial_number IS
  'Master sheet col A — serial from the pre-app Excel sheet. NULL for cars added '
  'in the app. When set, value_addition is frozen at the imported figure.';
COMMENT ON COLUMN public.vehicles.sale_status IS
  'Master sheet col BC (AVAILABLE / SOLD) — the sheet''s own status, separate '
  'from the pipeline status. A won sales deal sets it to sold.';
COMMENT ON COLUMN public.vehicles.vat_on_buying_price IS
  'Master sheet col T — VAT actually paid on the buying price. 0 when none.';

-- Existing sold cars (pipeline status) are SOLD on the sheet too.
UPDATE public.vehicles
   SET sale_status = 'sold'
 WHERE status = 'sold' AND sale_status = 'available';

-- 2–5. Snapshot, then re-derive the figures -----------------------------------

CREATE TABLE IF NOT EXISTS public.vehicle_master_sheet_backfill_0050 AS
SELECT id,
       registration,
       vat_on_buying_price AS old_vat_on_buying_price,
       value_addition      AS old_value_addition,
       total_buying_price  AS old_total_buying_price,
       landed_cost         AS old_landed_cost,
       base_cost           AS old_base_cost,
       gross_earning       AS old_gross_earning,
       now()               AS snapshot_at
FROM public.vehicles;

-- The snapshot sits in the API-exposed schema; with RLS on and no policies it
-- is readable only by the service role, never by app users.
ALTER TABLE public.vehicle_master_sheet_backfill_0050 ENABLE ROW LEVEL SECURITY;

-- 3. Clear the auto-filled 20% (only where it is exactly the auto figure).
UPDATE public.vehicles
   SET vat_on_buying_price = 0
 WHERE legacy_serial_number IS NULL
   AND vat_on_buying_price <> 0
   AND vat_on_buying_price = ROUND(buying_price * 0.2, 2);

-- 4. Value addition = Things to Do cost roll-up.
UPDATE public.vehicles v
   SET value_addition = t.total
  FROM (
    SELECT vehicle_id, SUM(cost) AS total
      FROM public.todo_items
     WHERE status <> 'cancelled' AND cost IS NOT NULL
     GROUP BY vehicle_id
  ) t
 WHERE v.id = t.vehicle_id
   AND v.legacy_serial_number IS NULL;

-- 5. Stored totals (keep in step with computeCostTotals).
UPDATE public.vehicles v
SET total_buying_price = c.tbp,
    landed_cost        = c.tbp + c.below_ai,
    base_cost          = c.tbp + c.below_ai + c.below_landed,
    gross_earning      = CASE
                           WHEN COALESCE(v.selling_price, v.listing_price) IS NULL THEN NULL
                           ELSE ROUND(COALESCE(v.selling_price, v.listing_price)
                                      - (c.tbp + c.below_ai + c.below_landed))
                         END
FROM (
  SELECT id,
         ( COALESCE(buying_price,0)       + COALESCE(vat_on_buying_price,0)
         + COALESCE(buyers_fee,0)         + COALESCE(vat_on_buyers_fee,0)
         + COALESCE(inspection_charge,0)  + COALESCE(vat_on_inspection_charge,0)
         + COALESCE(ev_assured_charge,0)  + COALESCE(vat_on_ev_assured_charge,0)
         + COALESCE(battery_report_fee,0) + COALESCE(vat_on_battery_report_fee,0)
         + COALESCE(late_storage_fee,0)   + COALESCE(vat_on_late_storage_fee,0)
         + COALESCE(collection_fee,0)     + COALESCE(vat_on_collection_fee,0)
         + COALESCE(delivery_fee,0)       + COALESCE(vat_on_delivery_fee,0)
         ) AS tbp,
         ( COALESCE(other_charges,0) + COALESCE(loading_fee,0)
         + COALESCE(unloading_fee,0) + COALESCE(value_addition,0)
         ) AS below_ai,
         ( COALESCE(stocking_charges,0) + COALESCE(warranty_cost,0) ) AS below_landed
  FROM public.vehicles
) c
WHERE v.id = c.id;
