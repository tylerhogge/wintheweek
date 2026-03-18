-- Allow multiple submissions per employee per campaign per week.
-- The application-level send-weekly route runs once per week so duplicates
-- won't occur in production; removing this constraint lets the test send
-- route create a fresh submission on each send so replies stack up.
ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_campaign_id_employee_id_week_start_key;
