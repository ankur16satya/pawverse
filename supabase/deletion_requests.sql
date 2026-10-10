-- Account / data deletion requests submitted from /delete-account.
-- Run this once in Supabase → SQL Editor.

create table if not exists public.deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  name          text,
  user_id       uuid,                       -- set when the requester was signed in
  request_type  text not null default 'full_account'
                check (request_type in ('full_account', 'specific_data')),
  reason        text,
  details       text,
  verified      boolean not null default false, -- true = signed in with the same email
  status        text not null default 'pending'
                check (status in ('pending', 'completed', 'rejected')),
  admin_note    text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists deletion_requests_email_idx on public.deletion_requests (email);
create index if not exists deletion_requests_status_idx on public.deletion_requests (status);

alter table public.deletion_requests enable row level security;

-- Anyone (signed in or not) may submit a new pending request.
drop policy if exists "Anyone can submit a deletion request" on public.deletion_requests;
create policy "Anyone can submit a deletion request"
  on public.deletion_requests for insert
  to anon, authenticated
  with check (status = 'pending');

-- Only super admins can read and update requests (keep in sync with SUPER_ADMINS in src/pages/superadmin.js).
drop policy if exists "Super admins can read deletion requests" on public.deletion_requests;
create policy "Super admins can read deletion requests"
  on public.deletion_requests for select
  to authenticated
  using ((auth.jwt() ->> 'email') in ('ankur16satya@gmail.com', 'sharmasiddharth269@gmail.com'));

drop policy if exists "Super admins can update deletion requests" on public.deletion_requests;
create policy "Super admins can update deletion requests"
  on public.deletion_requests for update
  to authenticated
  using ((auth.jwt() ->> 'email') in ('ankur16satya@gmail.com', 'sharmasiddharth269@gmail.com'));
