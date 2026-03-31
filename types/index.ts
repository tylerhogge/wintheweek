export type Priority = {
  name: string
  description: string
}

export type Organization = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  digest_notify: boolean
  notify_on_reply: boolean
  priorities: Priority[] | null
  // Stripe billing
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: 'trial' | 'starter' | 'pro' | 'core' | 'growth' | 'enterprise' | null
  plan_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | null
  trial_ends_at: string | null
  current_period_end: string | null
  created_at: string
}

export type Profile = {
  id: string
  org_id: string
  name: string | null
  email: string
  role: 'admin' | 'member'
  created_at: string
}

export type Employee = {
  id: string
  org_id: string
  name: string
  email: string
  team: string | null
  function: string | null
  active: boolean
  slack_user_id: string | null
  manager_of_teams: string[] | null
  created_at: string
}

export type SlackIntegration = {
  id: string
  org_id: string
  team_id: string
  team_name: string
  bot_user_id: string
  created_at: string
}

export type Campaign = {
  id: string
  org_id: string
  name: string
  subject: string
  body: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  send_day: number   // 1 = Monday … 7 = Sunday
  send_time: string  // HH:MM
  timezone: string
  active: boolean
  target_teams: string[] | null  // null = all teams; array = specific teams only
  created_at: string
}

export type Submission = {
  id: string
  campaign_id: string
  employee_id: string
  week_start: string  // ISO date, always the Monday of that week
  sent_at: string | null
  replied_at: string | null
  email_status: 'sent' | 'delivered' | 'opened' | 'bounced' | 'complained'
  created_at: string
}

export type ManagerReply = {
  id: string
  response_id: string
  body_clean: string
  sender_type: 'manager' | 'employee'
  employee_name: string | null
  created_at: string
}

export type Response = {
  id: string
  submission_id: string
  body_raw: string
  body_clean: string | null
  created_at: string
  manager_replies?: ManagerReply[]
}

export type Insight = {
  id: string
  org_id: string
  campaign_id: string | null
  week_start: string
  summary: string | null
  highlights: string[] | null
  cross_functional_themes: string | null
  risk_items: string | null
  bottom_line: string | null
  initiative_tracking: string | null
  sentiment_score: number | null
  sentiment_label: string | null
  themes: string[] | null
  generated_at: string
}

export type WaitlistEntry = {
  id: string
  email: string
  created_at: string
}

// ── Composed types ──────────────────────────────────────────────────────────

export type SubmissionWithDetails = Submission & {
  employee: Employee
  response: Response | null
}

export type WeekDigest = {
  week_start: string
  total: number
  replied: number
  submissions: SubmissionWithDetails[]
  insight: Insight | null
}
