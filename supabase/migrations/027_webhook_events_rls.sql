-- Enable RLS on webhook_events to resolve Supabase security warning.
-- This table is only accessed by the service role (server-side API routes),
-- so we enable RLS with no public policies — effectively blocking all
-- direct client access while service_role bypasses RLS automatically.

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
