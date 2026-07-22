-- Run once in the Supabase SQL editor.
-- Whiskey redesign: one record per customer with a rent split, a global
-- Marc email + monthly automation, and a statement history.

-- One record per customer. tonton_percent = the % of rent Marc owes TonTon;
-- Marc keeps the remaining %.
alter table whiskey_rentals add column if not exists tonton_percent numeric;
update whiskey_rentals set tonton_percent = share_percent
  where tonton_percent is null and share_percent is not null;

-- Global settings for the combined monthly statement to Marc.
create table if not exists whiskey_settings (
  id int primary key default 1,
  marc_email text,
  reminders_enabled boolean not null default false,
  send_day int not null default 1,
  updated_at timestamptz not null default now()
);
insert into whiskey_settings (id) values (1) on conflict (id) do nothing;

-- Sent-statement history.
create table if not exists whiskey_statements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  month text not null,          -- "2026-07"
  to_email text,
  status text not null,         -- 'sent' | 'failed'
  total numeric,
  spot_count int,
  auto boolean not null default false,
  error text
);
