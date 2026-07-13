-- TonTon Storage - run this in the Supabase SQL editor (once).

create extension if not exists "pgcrypto";

create table if not exists rentals (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,          -- client intake link
  renew_token text unique not null,    -- tenant renewal link
  status text not null default 'pending',
  -- pending -> submitted -> active -> renewal_notified
  --   -> extend_requested | vacating -> renewed | expired
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  finalized_at timestamptz,
  renewal_notified_at timestamptz,
  response_at timestamptz,
  contact jsonb,     -- provider-entered { email, phone } captured on the call
  client jsonb,      -- client-submitted { name, phone, email, property{...} }
  terms jsonb,       -- { termType, monthlyFee, paymentSchedule, paymentMethod, agreementDate, startDate, endDate }
  renewal jsonb,     -- { choice: 'extend'|'vacate', respondedAt }
  extension jsonb,   -- provider offer { months, monthlyFee, effectiveDate, expirationDate, agreementDate }
  notes text
);

create index if not exists rentals_status_idx on rentals (status);
create index if not exists rentals_token_idx on rentals (token);
create index if not exists rentals_renew_token_idx on rentals (renew_token);

-- This app talks to Supabase with the service-role key from server-side code only,
-- so row level security is left off for the rough draft. Add RLS before exposing
-- any anon/browser access to this table.
