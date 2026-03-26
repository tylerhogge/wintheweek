-- Additional performance indexes to speed up page loads.

-- campaigns: queried by org_id on every campaigns page load + RLS
CREATE INDEX IF NOT EXISTS campaigns_org_id_idx ON campaigns(org_id);

-- campaigns: queried by (active, send_day) on every weekly cron run
CREATE INDEX IF NOT EXISTS campaigns_active_send_day_idx ON campaigns(active, send_day) WHERE active = true;

-- profiles: my_org_id() RLS helper queries by id (already PK), but
-- reverse lookups by org_id happen in admin notification queries
CREATE INDEX IF NOT EXISTS profiles_org_id_idx ON profiles(org_id);

-- slack_integrations: queried by org_id on settings + DM sending
CREATE INDEX IF NOT EXISTS slack_integrations_org_id_idx ON slack_integrations(org_id);

-- manager_replies: queried by response_id + ordered by created_at
CREATE INDEX IF NOT EXISTS manager_replies_response_created_idx ON manager_replies(response_id, created_at);
