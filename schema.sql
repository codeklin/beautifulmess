create extension if not exists pgcrypto;

create table if not exists public.writings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category text not null check (category in ('linkedin', 'poem', 'prose', 'spoken_word')),
  content text not null,
  audio_url text,
  is_published boolean default false,
  created_at timestamptz default now()
);

alter table public.writings enable row level security;

grant select on public.writings to anon, authenticated;
grant insert, update, delete on public.writings to authenticated;

create policy "Anyone can read published writings" on public.writings
  for select to anon, authenticated using (is_published = true);

create policy "Authenticated users can insert writings" on public.writings
  for insert to authenticated with check (true);

create policy "Authenticated users can update writings" on public.writings
  for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete writings" on public.writings
  for delete to authenticated using (true);
