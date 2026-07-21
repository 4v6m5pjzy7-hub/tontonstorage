-- Run once in the Supabase SQL editor.
-- Adds location/spot tagging to contract rentals, and a separate table for
-- Whiskey spots (Marc Jacob signs those customers directly, so there is no
-- contract on our side - we only track the profit share he owes us).

alter table rentals add column if not exists location text;
alter table rentals add column if not exists spot text;
create index if not exists rentals_location_idx on rentals (location);

create table if not exists whiskey_rentals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  spot text,
  monthly_amount numeric,
  share_percent numeric,
  active boolean not null default true,
  -- { "2026-07": { "at": "...", "amount": 90 } } - months already settled
  settled jsonb not null default '{}'::jsonb,
  notes text
);
