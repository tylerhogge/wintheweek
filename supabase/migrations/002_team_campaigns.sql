-- ═══════════════════════════════════════════════════════════════════════════
-- Win the Week — Team-targeted campaigns
-- Adds target_teams column to campaigns.
-- NULL means "send to all active employees" (existing behaviour).
-- A non-empty array means "send only to employees whose team is in this list".
-- ═══════════════════════════════════════════════════════════════════════════

alter table campaigns
  add column if not exists target_teams text[] default null;
