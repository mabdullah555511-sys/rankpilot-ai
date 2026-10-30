-- RankPilot AI initial schema. Run in Supabase SQL Editor.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);
create table public.websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);
create table public.seo_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  website_id uuid references public.websites on delete set null,
  url text not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  score int,
  pages_scanned int not null default 0,
  summary jsonb,
  created_at timestamptz not null default now()
);
create table public.audit_results (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.seo_audits on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  check_name text not null,
  severity text not null check (severity in ('critical','high','medium','low','pass')),
  page_url text,
  evidence text,
  recommendation text,
  passed boolean not null default false
);
create table public.keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now()
);
create table public.content_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  topic text not null,
  plan jsonb,
  created_at timestamptz not null default now()
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  plan text not null default 'free',
  status text not null default 'inactive',
  updated_at timestamptz not null default now()
);
create index on public.seo_audits (user_id, created_at desc);
create index on public.audit_results (audit_id);
create index on public.websites (user_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.websites enable row level security;
alter table public.seo_audits enable row level security;
alter table public.audit_results enable row level security;
alter table public.keywords enable row level security;
alter table public.content_plans enable row level security;
alter table public.subscriptions enable row level security;

create policy profiles_select on public.profiles for select using (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- Users can only edit full_name; role can never be changed from the client.
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

create policy own_rows on public.websites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.seo_audits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.audit_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.keywords for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.content_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Subscriptions: read-only for users. Writes happen server-side only (service role) after verified payment.
create policy subs_select on public.subscriptions for select using (auth.uid() = user_id);

-- Auto-create a profile for each new user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
