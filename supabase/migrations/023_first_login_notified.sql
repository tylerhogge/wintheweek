-- Track whether we've sent the admin a first-login notification for this user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_login_notified boolean DEFAULT false;
