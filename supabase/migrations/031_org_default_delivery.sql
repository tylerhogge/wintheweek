-- Add default delivery method to organizations.
-- 'email' = check-ins sent via email (default)
-- 'slack' = check-ins sent via Slack DM (requires Slack integration)
alter table organizations
  add column if not exists default_delivery text not null default 'email'
  check (default_delivery in ('email', 'slack'));
