-- Email OTP verification (sent through our own Gmail SMTP, not Supabase's
-- built-in mailer, so Supabase's "2 emails per hour" limit does not apply).
-- Run this once in Supabase → SQL Editor.

create table if not exists public.email_otps (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  purpose      text not null check (purpose in ('signup', 'reset', 'verify')),
  code_hash    text not null,
  attempts     int not null default 0,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists email_otps_lookup_idx on public.email_otps (email, purpose, created_at desc);

-- RLS on with NO policies: only the server (service role key) can touch this table.
alter table public.email_otps enable row level security;

-- Look up an auth user's id by email. Only callable by the service role.
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;

-- Optional housekeeping: delete OTPs older than a day.
-- delete from public.email_otps where created_at < now() - interval '1 day';
