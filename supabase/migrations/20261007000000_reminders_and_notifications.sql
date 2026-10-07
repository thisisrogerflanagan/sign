-- Migration for Reminders + Notifications (#24)

-- ==============================================================================
-- 1. NOTIFICATIONS
-- ==============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_notifications_user_id_created_at
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_document_id
  on public.notifications(document_id);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ==============================================================================
-- 2. REMINDERS
-- ==============================================================================
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  remind_at timestamptz not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'fired', 'cancelled', 'completed')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_reminders_user_id_created_at
  on public.reminders(user_id, created_at desc);

create index if not exists idx_reminders_status_remind_at
  on public.reminders(status, remind_at);

create index if not exists idx_reminders_document_id
  on public.reminders(document_id);

alter table public.reminders enable row level security;

create policy "Users can view own reminders"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "Users can insert own reminders"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reminders"
  on public.reminders for update
  using (auth.uid() = user_id);

create policy "Users can delete own reminders"
  on public.reminders for delete
  using (auth.uid() = user_id);
