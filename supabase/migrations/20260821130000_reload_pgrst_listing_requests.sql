-- Expose agency_listing_requests to PostgREST (SQL editor creates the table
-- but the API schema cache may not see it until notified).
-- No public SELECT. service_role bypasses RLS for admin reads.

GRANT INSERT ON TABLE agency_listing_requests TO anon, authenticated;
GRANT ALL ON TABLE agency_listing_requests TO service_role;

NOTIFY pgrst, 'reload schema';
