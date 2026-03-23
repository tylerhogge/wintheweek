-- ═══════════════════════════════════════════════════════════════════════════
-- Security hardening: enable RLS on tables that were missed
-- ═══════════════════════════════════════════════════════════════════════════

-- ── slack_integrations: contains OAuth access tokens ──────────────────────
alter table slack_integrations enable row level security;

create policy "Slack integrations scoped to org" on slack_integrations
  for select using (org_id = my_org_id());

create policy "Slack integrations insert for org" on slack_integrations
  for insert with check (org_id = my_org_id());

create policy "Slack integrations update for org" on slack_integrations
  for update using (org_id = my_org_id());

create policy "Slack integrations delete for org" on slack_integrations
  for delete using (org_id = my_org_id());

-- ── manager_replies: scoped to org via response → submission → campaign ──
alter table manager_replies enable row level security;

create policy "Manager replies scoped to org" on manager_replies
  for select using (
    response_id in (
      select r.id from responses r
      join submissions s on s.id = r.submission_id
      join campaigns c on c.id = s.campaign_id
      where c.org_id = my_org_id()
    )
  );

create policy "Manager replies insert for org" on manager_replies
  for insert with check (
    response_id in (
      select r.id from responses r
      join submissions s on s.id = r.submission_id
      join campaigns c on c.id = s.campaign_id
      where c.org_id = my_org_id()
    )
  );

-- ── Upgrade responses policy to support update (for like toggle) ─────────
-- The existing policy is SELECT only; we need UPDATE for liked_at
create policy "Responses update in org" on responses
  for update using (
    submission_id in (
      select s.id from submissions s
      join campaigns c on c.id = s.campaign_id
      where c.org_id = my_org_id()
    )
  );
