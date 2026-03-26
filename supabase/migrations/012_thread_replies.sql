-- Add sender_type to manager_replies so we can store both manager replies
-- and employee follow-up messages in the same conversation thread.
-- Also add employee_name for display context on employee follow-ups.

ALTER TABLE manager_replies
  ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'manager',
  ADD COLUMN IF NOT EXISTS employee_name TEXT;

-- Ensure we can filter by sender_type efficiently
CREATE INDEX IF NOT EXISTS manager_replies_sender_type_idx ON manager_replies(sender_type);

COMMENT ON COLUMN manager_replies.sender_type IS 'manager = CEO/admin reply, employee = employee follow-up message';
COMMENT ON COLUMN manager_replies.employee_name IS 'Employee name, populated only when sender_type = employee';
