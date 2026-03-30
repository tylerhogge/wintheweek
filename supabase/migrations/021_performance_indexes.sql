-- Performance indexes for dashboard, trends, and search queries

-- submissions: queries filtered by employee_id and week_start (e.g., historical view for an employee)
CREATE INDEX IF NOT EXISTS idx_submissions_emp_week ON submissions(employee_id, week_start);

-- submissions: queries filtered by campaign_id and week_start (used for idempotency checks in send-weekly)
CREATE INDEX IF NOT EXISTS idx_submissions_campaign_week ON submissions(campaign_id, week_start);

-- employees: queries for active employees by org (e.g., listing team, checking active status)
CREATE INDEX IF NOT EXISTS idx_employees_org_active ON employees(org_id, active);

-- responses: queries for responses by submission_id (RLS checks, insight generation joins)
CREATE INDEX IF NOT EXISTS idx_responses_submission ON responses(submission_id);

-- insights: queries filtered by org_id and week_start (dashboard, weekly generation)
CREATE INDEX IF NOT EXISTS idx_insights_org_week ON insights(org_id, week_start);

-- campaigns: queries for active campaigns by org (e.g., campaign management page)
CREATE INDEX IF NOT EXISTS idx_campaigns_org_active ON campaigns(org_id, active);

-- Full-text search index for response search (body_clean column exists for cleaned email text)
CREATE INDEX IF NOT EXISTS idx_responses_fts ON responses USING GIN(to_tsvector('english', coalesce(body_clean, '')));
