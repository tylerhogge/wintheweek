-- Add Stripe billing columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS plan text CHECK (plan IN ('trial', 'pro', 'growth', 'enterprise')),
  ADD COLUMN IF NOT EXISTS plan_status text CHECK (plan_status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Index for webhook lookups by customer ID and subscription ID
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id
  ON organizations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription_id
  ON organizations (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
