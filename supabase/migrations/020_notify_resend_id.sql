-- Store the Resend message ID from the first admin notification email.
-- Used for Gmail threading: follow-up notifications reference this ID
-- in their In-Reply-To header so Gmail groups the whole conversation.
ALTER TABLE responses ADD COLUMN IF NOT EXISTS notify_resend_id text;
