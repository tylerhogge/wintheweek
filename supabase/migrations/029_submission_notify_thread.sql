-- Move email threading anchor from response to submission level.
-- All admin notifications for the same submission will thread together
-- in Gmail regardless of which response/reply path triggers them.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS notify_thread_id text;
