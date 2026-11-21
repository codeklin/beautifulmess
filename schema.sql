create extension if not exists pgcrypto;

create table if not exists public.writings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category text not null check (category in ('linkedin', 'poem', 'prose', 'spoken_word')),
  content text not null,
  audio_url text,
  is_published boolean default false,
  status text default 'published' check (status in ('draft', 'scheduled', 'published')),
  scheduled_for timestamptz,
  created_at timestamptz default now()
);

alter table public.writings enable row level security;

grant select on public.writings to anon, authenticated;
revoke insert, update, delete on public.writings from anon;
grant insert, update, delete on public.writings to authenticated;

drop policy if exists "Anyone can read published writings" on public.writings;
drop policy if exists "Authenticated users can insert writings" on public.writings;
drop policy if exists "Authenticated users can update writings" on public.writings;
drop policy if exists "Authenticated users can delete writings" on public.writings;
drop policy if exists "Only owner can insert writings" on public.writings;
drop policy if exists "Only owner can update writings" on public.writings;
drop policy if exists "Only owner can delete writings" on public.writings;

-- Keep this owner address aligned with ADMIN_EMAIL in the app environment.
create policy "Anyone can read published writings" on public.writings
  for select to anon, authenticated using (
    (
      is_published = true
      and (
        (status = 'published' and (scheduled_for is null or scheduled_for <= now()))
        or (status = 'scheduled' and scheduled_for <= now())
      )
    )
    or (auth.jwt() ->> 'email') = 'clickcom007@yahoo.com'
  );

create policy "Only owner can insert writings" on public.writings
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'clickcom007@yahoo.com');

create policy "Only owner can update writings" on public.writings
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'clickcom007@yahoo.com')
  with check ((auth.jwt() ->> 'email') = 'clickcom007@yahoo.com');

create policy "Only owner can delete writings" on public.writings
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'clickcom007@yahoo.com');

-- Extensions for automated background jobs and network requests
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Weekly keep-alive cron job
-- Supabase free tier pauses projects after 7 days of inactivity.
-- This job runs every Monday at 09:00 UTC and pings your live app endpoint.
-- Replace 'https://your-domain.vercel.app' with your actual deployed website URL.
select cron.schedule(
  'weekly-app-keepalive',
  '0 9 * * 1',
  $$
  select net.http_get(
    url := 'https://your-domain.vercel.app/api/health'
  );
  $$
);

-- Optional helper queries:
-- Check scheduled cron jobs:
-- select * from cron.job;

-- Check execution logs:
-- select * from cron.job_run_details order by start_time desc limit 10;

-- Remove the cron job if no longer needed:
-- select cron.unschedule('weekly-app-keepalive');
