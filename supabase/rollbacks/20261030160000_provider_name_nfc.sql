-- Paired rollback for supabase/migrations/20261030160000_provider_name_nfc.sql.
-- This file is not a migration and must not be moved into supabase/migrations.
-- Run it only as its own Founder GO. After the application orders by
-- provider_name_nfc, revert the application before this script.
-- The same session gate used by the forward migration is required.

DO $hold$
BEGIN
  IF current_setting('insurance.provider_name_nfc_go', true) IS DISTINCT FROM 'allow' THEN
    RAISE EXCEPTION 'provider_name_nfc rollback is held for its own Founder GO.';
  END IF;
END
$hold$;

DROP FUNCTION IF EXISTS public.provider_name_nfc(public.providers);

NOTIFY pgrst, 'reload schema';
