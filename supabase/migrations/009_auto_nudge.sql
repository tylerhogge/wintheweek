-- Add auto_nudge toggle to organizations
-- When enabled, non-respondents get a friendly nudge email ~48h before Wall of Shame fires
alter table organizations
  add column if not exists auto_nudge boolean not null default false;
