-- Stripe checkout idempotency (web plumbing — NOT one of Rusti's sheets).
-- Maps a completed Stripe session to the order it produced, so a refresh of the
-- success page can't create a duplicate order. Run once in the SQL Editor.

create table if not exists public.web_checkout_sessions (
  session_id text primary key,
  order_id   text not null,
  created_at timestamptz default now()
);

alter table public.web_checkout_sessions enable row level security;
-- No public policy: only the server (service role) touches this table.
