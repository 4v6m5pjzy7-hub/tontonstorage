-- Run once in the Supabase SQL editor.
-- Deleting a rental now just stamps deleted_at. It stays restorable for 30
-- days (with its signatures intact) and is purged automatically after that.

alter table rentals add column if not exists deleted_at timestamptz;
create index if not exists rentals_deleted_idx on rentals (deleted_at);
