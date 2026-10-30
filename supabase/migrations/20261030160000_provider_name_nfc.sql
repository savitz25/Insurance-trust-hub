-- INS-PR121-122-SECURITY-REPAIR-008
-- Versioned computed field for PostgREST ordering.
-- Supabase Security must re-review the head that contains this file before
-- any Founder GO. Draft PR checks do not apply it.
--
-- The session gate refuses an automatic runner. The Founder GO sets
-- insurance.provider_name_nfc_go to allow in the same transaction, then runs
-- this file. No index, generated column, view, publication column, table
-- privilege, or policy change belongs here. Existing row visibility stays
-- on the providers policies.

DO $hold$
BEGIN
  IF current_setting('insurance.provider_name_nfc_go', true) IS DISTINCT FROM 'allow' THEN
    RAISE EXCEPTION 'provider_name_nfc is held. Set insurance.provider_name_nfc_go=allow only for the Founder GO.';
  END IF;
END
$hold$;

-- 'NFC' is a text literal. A bare NFC token is read as a providers column.
CREATE FUNCTION public.provider_name_nfc(public.providers)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY INVOKER
AS $$
  SELECT pg_catalog.normalize($1.name, 'NFC');
$$;

REVOKE ALL ON FUNCTION public.provider_name_nfc(public.providers) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_name_nfc(public.providers) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
