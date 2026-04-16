-- Track whether we've sent the onboarding nudge email to this admin
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_nudge_sent_at timestamptz DEFAULT NULL;
