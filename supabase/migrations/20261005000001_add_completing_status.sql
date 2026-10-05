-- Migration to support transitional 'completing' status for atomic completion pipelines
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents add constraint documents_status_check
  check (status in ('draft', 'sent', 'viewed', 'completing', 'completed', 'declined', 'voided', 'deleted'));
