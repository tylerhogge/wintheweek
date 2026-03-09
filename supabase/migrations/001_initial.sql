-- ═══════════════════════════════════════════════════════════════════════════
-- Win the Week — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor, or via `supabase db push`
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Organizations ───────────────────────────────────────────────────────────
create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  logo_url   text,
  created_at timestamptz default now()
);

-- ── Profiles (extends auth.users) ───────────────────────────────────────────
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid references organizations(id) on delete cascade,
  name       text,
  email      text not null,
  role       text default 'admin' check (role in ('admin', 'member')),
  created_at timestamptz default now()
);

-- Auto-create a profile when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Employees ───────────────────────────────────────────────────────────────
-- People who receive the check-in emails. May or may not have a profile account.
create table employees (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade not null,
  name       text not null,
  email      text not null,
  team       text,
  function   text,
  active     boolean default true,
  created_at timestamptz default now(),
  unique (org_id, email)
);

-- ── Campaigns ───────────────────────────────────────────────────────────────
create table campaigns (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade not null,
  name       text not null,
  subject    text not null,
  body       text not null,
  frequency  text default 'weekly' check (frequency in ('weekly', 'biweekly', 'monthly')),
  send_day   int  default 5 check (send_day between 1 and 7),  -- 1=Mon, 7=Sun
  send_time  time default '09:00',
  timezone   text default 'America/New_York',
  active     boolean default true,
  created_at timestamptz default now()
);

-- ── Submissions ──────────────────────────────────────────────────────────────
-- One row per employee per campaign per week. Created when the email is sent.
create table submissions (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id)  on delete cascade not null,
  employee_id uuid references employees(id)  on delete cascade not null,
  week_start  date not null,  -- Always the Monday of that week (yyyy-mm-dd)
  sent_at     timestamptz,
  replied_at  timestamptz,
  created_at  timestamptz default now(),
  unique (campaign_id, employee_id, week_start)
);

-- Index for the inbound email webhook lookup
create index submissions_id_idx on submissions (id);
-- Index for dashboard queries by week
create index submissions_week_idx on submissions (week_start);

-- ── Responses ────────────────────────────────────────────────────────────────
-- The employee's reply. One per submission.
create table responses (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade not null unique,
  body_raw      text not null,   -- Full email text as received
  body_clean    text,            -- Stripped of quotes/signatures
  created_at    timestamptz default now()
);

-- ── Insights ─────────────────────────────────────────────────────────────────
-- AI-generated weekly summary. One per org per week.
create table insights (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizations(id) on delete cascade not null,
  campaign_id  uuid references campaigns(id),
  week_start   date not null,
  summary      text,
  highlights   jsonb,  -- string[]
  generated_at timestamptz default now(),
  unique (org_id, week_start)
);

-- ── Waitlist ──────────────────────────────────────────────────────────────────
create table waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════

alter table organizations enable row level security;
alter table profiles      enable row level security;
alter table employees     enable row level security;
alter table campaigns     enable row level security;
alter table submissions   enable row level security;
alter table responses     enable row level security;
alter table insights      enable row level security;
alter table waitlist      enable row level security;

-- Helper: get the org_id of the current authenticated user
create or replace function my_org_id()
returns uuid language sql stable security definer as $$
  select org_id from profiles where id = auth.uid()
$$;

-- Organizations: users can only see their own org
create policy "Users see their org" on organizations
  for select using (id = my_org_id());

create policy "Users update their org" on organizations
  for update using (id = my_org_id());

-- Profiles: users can see and update their own profile
create policy "Users see own profile" on profiles
  for select using (id = auth.uid());

create policy "Users update own profile" on profiles
  for update using (id = auth.uid());

-- Employees: scoped to org
create policy "Employees in org" on employees
  for all using (org_id = my_org_id());

-- Campaigns: scoped to org
create policy "Campaigns in org" on campaigns
  for all using (org_id = my_org_id());

-- Submissions: scoped to org via campaign
create policy "Submissions in org" on submissions
  for select using (
    campaign_id in (select id from campaigns where org_id = my_org_id())
  );

-- Responses: scoped to org via submission → campaign
create policy "Responses in org" on responses
  for select using (
    submission_id in (
      select s.id from submissions s
      join campaigns c on c.id = s.campaign_id
      where c.org_id = my_org_id()
    )
  );

-- Insights: scoped to org
create policy "Insights in org" on insights
  for select using (org_id = my_org_id());

-- Waitlist: public insert, no reads
create policy "Public waitlist insert" on waitlist
  for insert with check (true);
