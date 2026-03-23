-- ── Performance indexes for common query patterns ─────────────────────────
-- These target the hot paths: dashboard, trends, send-weekly, wall-of-shame

-- Submissions: campaign + week lookups (send-weekly idempotency check)
create index if not exists submissions_campaign_week_idx
  on submissions(campaign_id, week_start desc);

-- Submissions: employee + week lookups (trends, inbound email matching)
create index if not exists submissions_employee_week_idx
  on submissions(employee_id, week_start desc);

-- Submissions: unreplied submissions for a given week (dashboard, auto-nudge)
create index if not exists submissions_unreplied_week_idx
  on submissions(week_start, employee_id)
  where replied_at is null and sent_at is not null;

-- Insights: org + week lookups (dashboard, digest)
create index if not exists insights_org_week_idx
  on insights(org_id, week_start desc);

-- Employees: active employees by org (used on nearly every page)
create index if not exists employees_org_active_idx
  on employees(org_id, name)
  where active = true;

-- Employees: team lookup for active employees (dashboard team chips, campaign targeting)
create index if not exists employees_org_team_idx
  on employees(org_id, team)
  where active = true and team is not null;

-- Responses: submission lookup (dashboard join, like toggle)
create index if not exists responses_submission_idx
  on responses(submission_id);
