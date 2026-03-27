-- Track email delivery status from Resend webhooks
-- Status flow: sent → delivered → opened (or bounced/complained)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'sent';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS resend_email_id text;

-- Index for webhook lookups by Resend email ID
CREATE INDEX IF NOT EXISTS idx_submissions_resend_email_id ON submissions(resend_email_id) WHERE resend_email_id IS NOT NULL;
