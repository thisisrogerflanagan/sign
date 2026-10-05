-- Enable pgcrypto for UUIDs and hashing
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. PROFILES
-- ==============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. PURCHASES (Pre-sale & Stripe purchases backing the founder claim flow)
-- ==============================================================================
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  stripe_payment_id text,
  amount_cents int not null default 4900,
  claimed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists idx_purchases_email on public.purchases(lower(email));

-- ==============================================================================
-- 3. ENTITLEMENTS (Gates the application; 1 row per user)
-- ==============================================================================
create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'lifetime_founder',
  stripe_customer_id text,
  stripe_payment_id text,
  purchased_at timestamptz default timezone('utc'::text, now()),
  refund_status text not null default 'none' check (refund_status in ('none', 'requested', 'refunded')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. USAGE COUNTERS (Fair-use cap: 50 requests/month)
-- ==============================================================================
create table if not exists public.usage_counters (
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null, -- First of month, UTC
  requests_sent int not null default 0,
  primary key (user_id, period_start)
);

-- ==============================================================================
-- 5. DOCUMENTS (The core envelope record)
-- ==============================================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled Document',
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'completed', 'declined', 'voided', 'deleted')),
  storage_path_original text,
  storage_path_signed text,
  page_count int,
  is_test boolean not null default false,
  sender_message text,
  sent_at timestamptz,
  viewed_at timestamptz,
  completed_at timestamptz,
  declined_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_documents_owner_id on public.documents(owner_id);
create index if not exists idx_documents_status on public.documents(status);

-- Maintain updated_at trigger on documents
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_documents_updated on public.documents;
create trigger on_documents_updated
  before update on public.documents
  for each row execute function public.handle_updated_at();

-- ==============================================================================
-- 6. SIGNERS (Single signer in v1, prepared for multi-signer)
-- ==============================================================================
create table if not exists public.signers (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  name text,
  email text not null,
  token_hash text unique,
  token_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_signers_document_id on public.signers(document_id);

-- ==============================================================================
-- 7. FIELDS (Placed by sender, filled by signer)
-- Coordinates normalized 0-1 relative to page size
-- ==============================================================================
create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  signer_id uuid references public.signers(id) on delete cascade,
  type text not null check (type in ('signature', 'initials', 'date', 'text')),
  page int not null default 1,
  x float not null,
  y float not null,
  width float not null,
  height float not null,
  required boolean not null default true,
  value text,
  filled_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_fields_document_id on public.fields(document_id);

-- ==============================================================================
-- 8. AUDIT EVENTS (Append-only activity record)
-- ==============================================================================
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  actor_type text not null check (actor_type in ('sender', 'signer', 'system')),
  actor_email text,
  event_type text not null check (event_type in (
    'document_created',
    'document_sent',
    'document_viewed',
    'field_filled',
    'document_completed',
    'document_declined',
    'reminder_sent',
    'document_voided',
    'document_deleted',
    'signed_pdf_downloaded'
  )),
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_audit_events_document_id on public.audit_events(document_id);

-- ==============================================================================
-- 9. EMAIL LOG
-- ==============================================================================
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete set null,
  to_email text not null,
  template text not null,
  provider_message_id text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ==============================================================================
-- 10. AUTH TRIGGER: AUTO-CREATE PROFILE ON SIGNUP
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.purchases enable row level security;
alter table public.entitlements enable row level security;
alter table public.usage_counters enable row level security;
alter table public.documents enable row level security;
alter table public.signers enable row level security;
alter table public.fields enable row level security;
alter table public.audit_events enable row level security;
alter table public.email_log enable row level security;

-- Profiles: users read and update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Entitlements: users view their own entitlement. Writes via service-role only.
create policy "Users can view own entitlement"
  on public.entitlements for select
  using (auth.uid() = user_id);

-- Purchases: users can view purchases claimed by them or matching their email
create policy "Users can view matching purchases"
  on public.purchases for select
  using (
    claimed_by = auth.uid() or
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Usage Counters: users view their own usage
create policy "Users can view own usage"
  on public.usage_counters for select
  using (auth.uid() = user_id);

-- Documents: owners can select, insert, and update their own documents
create policy "Owners can view own documents"
  on public.documents for select
  using (auth.uid() = owner_id);

create policy "Owners can insert own documents"
  on public.documents for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own documents"
  on public.documents for update
  using (auth.uid() = owner_id);

-- Signers: accessible only via the owning document
create policy "Owners can view signers of own documents"
  on public.signers for select
  using (
    exists (
      select 1 from public.documents
      where documents.id = signers.document_id
        and documents.owner_id = auth.uid()
    )
  );

create policy "Owners can insert signers of own documents"
  on public.signers for insert
  with check (
    exists (
      select 1 from public.documents
      where documents.id = signers.document_id
        and documents.owner_id = auth.uid()
    )
  );

create policy "Owners can update signers of own documents"
  on public.signers for update
  using (
    exists (
      select 1 from public.documents
      where documents.id = signers.document_id
        and documents.owner_id = auth.uid()
    )
  );

-- Fields: accessible only via owning document
create policy "Owners can view fields of own documents"
  on public.fields for select
  using (
    exists (
      select 1 from public.documents
      where documents.id = fields.document_id
        and documents.owner_id = auth.uid()
    )
  );

create policy "Owners can manage fields of own documents"
  on public.fields for all
  using (
    exists (
      select 1 from public.documents
      where documents.id = fields.document_id
        and documents.owner_id = auth.uid()
    )
  );

-- Audit Events: append-only; owners can select events for their documents.
-- NO client insert, update, or delete. Inserts happen strictly via service role.
create policy "Owners can view audit events of own documents"
  on public.audit_events for select
  using (
    exists (
      select 1 from public.documents
      where documents.id = audit_events.document_id
        and documents.owner_id = auth.uid()
    )
  );

-- Email Log: service role only, or viewable if related to owned document
create policy "Owners can view email log of own documents"
  on public.email_log for select
  using (
    exists (
      select 1 from public.documents
      where documents.id = email_log.document_id
        and documents.owner_id = auth.uid()
    )
  );

-- ==============================================================================
-- 12. STORAGE BUCKETS AND POLICIES
-- Buckets: 'originals' and 'signed' (Private, 10 MB max, application/pdf only)
-- Path convention: {user_id}/{document_id}/original.pdf
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('originals', 'originals', false, 10485760, array['application/pdf']),
  ('signed', 'signed', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf'];

-- Storage RLS: Owners have full access to files within their own folder ({user_id}/...)
create policy "Owners can read own original files"
  on storage.objects for select
  using (
    bucket_id = 'originals' and
    (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "Owners can upload own original files"
  on storage.objects for insert
  with check (
    bucket_id = 'originals' and
    (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "Owners can delete own original files"
  on storage.objects for delete
  using (
    bucket_id = 'originals' and
    (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "Owners can read own signed files"
  on storage.objects for select
  using (
    bucket_id = 'signed' and
    (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "Owners can delete own signed files"
  on storage.objects for delete
  using (
    bucket_id = 'signed' and
    (auth.uid()::text = (storage.foldername(name))[1])
  );
