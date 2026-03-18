-- Manager replies: captures the admin's reply to an employee's check-in response
CREATE TABLE IF NOT EXISTS manager_replies (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID        NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  body_clean  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by response
CREATE INDEX IF NOT EXISTS manager_replies_response_id_idx ON manager_replies(response_id);
