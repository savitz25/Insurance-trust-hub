-- Local proof of the privilege change. Do not run on Production.
-- Live anon and authenticated both hold GRANT ALL. Revoke DML from both.
-- Keep SELECT. Do not revoke service_role. A column-only REVOKE is not sufficient.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.providers FROM anon, authenticated;
