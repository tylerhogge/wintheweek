-- Track when a nudge was last sent for a submission
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS nudged_at timestamptz;
