-- Run once in the Supabase SQL editor.
-- Standalone invoices (boat stands, wash-rack moves, labour, etc.) - these are
-- separate from storage rentals and have their own numbering.

create table if not exists invoice_services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  default_rate numeric,
  active boolean not null default true
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  number serial,
  token text unique not null,           -- public link so the customer can view/print
  issued_on date not null default current_date,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  items jsonb not null default '[]'::jsonb,   -- [{ description, qty, rate }]
  tax_rate numeric not null default 7,
  notes text,
  status text not null default 'draft',       -- draft | sent | paid
  sent_at timestamptz,
  paid_on date
);

create index if not exists invoices_status_idx on invoices (status);

-- Starter services, only if the catalogue is empty. Edit or delete freely.
insert into invoice_services (name, default_rate)
select * from (values
  ('Boat stands (per set, per month)', 75),
  ('Move boat to wash rack', 150),
  ('Haul / reposition on site', 125),
  ('Labor (per hour)', 85)
) as v(name, default_rate)
where not exists (select 1 from invoice_services);
