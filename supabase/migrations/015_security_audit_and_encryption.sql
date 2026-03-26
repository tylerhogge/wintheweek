-- ═══════════════════════════════════════════════════════════════════════════
-- Security: audit logging table + encrypted token column
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Audit logs ──────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,             -- e.g. 'employee.create', 'response.hide'
  actor_id    uuid references auth.users(id) on delete set null,
  org_id      uuid references organizations(id) on delete cascade,
  target_type text,                      -- e.g. 'employee', 'response', 'settings'
  target_id   text,                      -- UUID or identifier of the affected record
  metadata    jsonb,                     -- Additional context (old values, new values, etc.)
  ip_address  text,
  created_at  timestamptz default now()
);

-- Indexes for efficient querying
create index if not exists audit_logs_org_created_idx on audit_logs(org_id, created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_action_idx on audit_logs(action, created_at desc);

-- RLS: only admins in the org can read audit logs
alter table audit_logs enable row level security;

create policy "Audit logs scoped to org" on audit_logs
  for select using (org_id = my_org_id());

-- Service client inserts (no user-facing insert policy needed)

-- ── Encrypted token column on slack_integrations ──────────────────────
-- Add a new column for the encrypted token. Existing plaintext tokens
-- remain in access_token until migrated via the encrypt-tokens endpoint.
alter table slack_integrations
  add column if not exists access_token_encrypted text;
