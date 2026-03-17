-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 002: Likes + Digest notification columns
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Like / reaction on a response ────────────────────────────────────────────
-- Admin can "like" an employee's reply directly from the dashboard.
alter table responses
  add column if not exists liked_at timestamptz;

-- ── Digest notification preference on org ────────────────────────────────────
-- When true: send the weekly digest email to the admin once all submissions
-- have been replied to.
alter table organizations
  add column if not exists digest_notify boolean default false;

-- ── Track whether the digest has been sent for a given week ──────────────────
alter table insights
  add column if not exists digest_sent_at timestamptz;

-- Allow service role to update liked_at on responses
-- (RLS currently only allows SELECT for responses — add update policy)
create policy if not exists "Org members can update responses"
  on responses for update
  using (
    submission_id in (
      select s.id from submissions s
      join campaigns c on c.id = s.campaign_id
      where c.org_id = my_org_id()
    )
  );

-- Allow service role to update insights (for digest_sent_at)
create policy if not exists "Org members can update insights"
  on insights for update
  using (org_id = my_org_id());
