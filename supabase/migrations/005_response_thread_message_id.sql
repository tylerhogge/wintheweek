-- Store the Message-ID of the employee's inbound reply email.
-- Used to set In-Reply-To / References when forwarding manager replies,
-- so the manager's response lands in the same email thread the employee started.
alter table responses add column if not exists thread_message_id text default null;
