-- ═══════════════════════════════════════════════════════════════════════════
-- Win the Week — Manager Visibility
-- Allows employees to be designated as managers of one or more teams.
-- Managers receive a digest email with their teams' replies.
-- ═══════════════════════════════════════════════════════════════════════════

alter table employees
  add column if not exists manager_of_teams text[] default null;

-- Index for quick lookups of who is a manager
create index if not exists employees_manager_idx
  on employees (org_id)
  where manager_of_teams is not null;
