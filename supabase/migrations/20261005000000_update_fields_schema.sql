-- Migration to support extended Send Fields:
-- 1. Add 'name' to fields type check
-- 2. Add 'label', 'assigned_to', and 'is_suggestion' columns

alter table public.fields drop constraint if exists fields_type_check;
alter table public.fields add constraint fields_type_check
  check (type in ('signature', 'initials', 'date', 'name', 'text'));

alter table public.fields add column if not exists label text;
alter table public.fields add column if not exists assigned_to text not null default 'signer' check (assigned_to in ('signer', 'sender'));
alter table public.fields add column if not exists is_suggestion boolean not null default false;
