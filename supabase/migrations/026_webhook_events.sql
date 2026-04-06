-- Idempotency table for Resend webhook deduplication.
-- Stores the svix-id from each processed webhook to prevent duplicate
-- processing when Resend retries due to slow handler responses.

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  svix_id text UNIQUE NOT NULL,
  event_type text,
  processed_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_svix_id ON webhook_events (svix_id);

-- Auto-cleanup: remove entries older than 7 days to prevent unbounded growth.
-- Run via pg_cron or a scheduled Supabase function.
-- For now, a simple policy: the table stays small since webhooks are low volume.
