-- ═══════════════════════════════════════════════════════════════════════════
-- Win the Week — Slack integration
-- ═══════════════════════════════════════════════════════════════════════════

-- One Slack workspace connection per org
create table if not exists slack_integrations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  access_token text not null,       -- Bot OAuth token (xoxb-...)
  team_id      text not null,       -- Slack workspace ID (T...)
  team_name    text not null,       -- Human-readable workspace name
  bot_user_id  text not null,       -- Bot's own Slack user ID — used to filter self-messages
  created_at   timestamptz default now(),
  constraint slack_integrations_org_id_key unique (org_id)
);

-- Slack user ID for each employee (populated by /api/slack/sync)
alter table employees
  add column if not exists slack_user_id text default null;
