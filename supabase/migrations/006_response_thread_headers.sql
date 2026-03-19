-- Store Outlook-specific threading headers (thread-topic, thread-index) from
-- the employee's inbound reply so we can pass them through when forwarding
-- the manager reply back into the same Outlook conversation.
alter table responses add column if not exists thread_headers jsonb default null;

-- Also fix thread_message_id semantics: it now stores the In-Reply-To value
-- from the employee's reply (= the original check-in's Message-ID), not the
-- employee's own Message-ID. Existing rows are NULL either way so no backfill needed.
