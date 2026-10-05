-- Seed data for local testing and verification

-- 1. Create a test user in auth.users if not exists
-- Password or magic link will authenticate this user
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000',
  'founder@watchposthq.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Roger Flanagan"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
)
on conflict (id) do nothing;

-- 2. Insert test purchase for founder claim verification
insert into public.purchases (
  id,
  email,
  stripe_payment_id,
  amount_cents,
  claimed_by,
  created_at
)
values (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
  'founder@watchposthq.com',
  'pi_test_1234567890',
  4900,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  now()
)
on conflict (id) do nothing;

-- 3. Entitle test user to lifetime_founder plan
insert into public.entitlements (
  user_id,
  plan,
  stripe_payment_id,
  purchased_at,
  refund_status,
  created_at
)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'lifetime_founder',
  'pi_test_1234567890',
  now(),
  'none',
  now()
)
on conflict (user_id) do nothing;

-- 4. Initialize usage counter for current month
insert into public.usage_counters (
  user_id,
  period_start,
  requests_sent
)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  date_trunc('month', current_date)::date,
  3
)
on conflict (user_id, period_start) do nothing;
