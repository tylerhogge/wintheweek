-- ═══════════════════════════════════════════════════════════════════════════
-- Win the Week — Wall of Shame (automated Slack + email non-respondent report)
-- ═══════════════════════════════════════════════════════════════════════════

alter table organizations
  add column if not exists shame_enabled          boolean default false,
  add column if not exists shame_channel_id       text    default null,   -- Slack channel ID (C...)
  add column if not exists shame_channel_name     text    default null,   -- e.g. "general" for display
  add column if not exists shame_email_enabled    boolean default false,  -- also email the admin the list
  add column if not exists shame_last_posted_week date    default null;   -- tracks last post to prevent double-firing
