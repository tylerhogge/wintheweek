-- Track last week the CEO briefing email was sent, to prevent double-sends
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS briefing_last_emailed_week date;
