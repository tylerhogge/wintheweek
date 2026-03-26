-- Soft-delete for responses: hidden responses are excluded from the
-- dashboard and AI insight generation but remain in the database.
ALTER TABLE responses ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

-- Index for filtering out hidden responses efficiently
CREATE INDEX IF NOT EXISTS responses_hidden_at_idx ON responses(hidden_at) WHERE hidden_at IS NULL;
