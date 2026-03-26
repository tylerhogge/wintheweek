-- Add hidden_at to submissions so pending cards (no response) can be dismissed too
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS submissions_hidden_at_idx ON submissions(hidden_at) WHERE hidden_at IS NULL;
