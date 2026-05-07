-- Roles enum
create type public.app_role as enum ('owner', 'manager');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer role check (avoid recursive RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('owner','manager')
  )
$$;

-- Auto-create profile + first signup becomes owner
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total_users int;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  select count(*) into total_users from public.user_roles where role = 'owner';
  if total_users = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'owner');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Profiles RLS
create policy "users see own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- user_roles RLS
create policy "staff read roles" on public.user_roles
  for select to authenticated using (public.is_staff(auth.uid()) or user_id = auth.uid());
create policy "owner manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'owner'))
  with check (public.has_role(auth.uid(), 'owner'));

-- Hackathons
create table public.hackathons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition text,
  organizer text,
  start_date date,
  end_date date,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hackathons enable row level security;
create policy "staff all hackathons" on public.hackathons
  for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- Award categories
create table public.award_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.award_categories enable row level security;
create policy "staff all categories" on public.award_categories
  for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- Certificates
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null unique, -- e.g. DLX-2026-XXXXX
  recipient_name text not null,
  recipient_email text,
  project_name text,
  hackathon_id uuid references public.hackathons(id) on delete set null,
  category_id uuid references public.award_categories(id) on delete set null,
  template_id text not null,
  issue_date date not null default current_date,
  status text not null default 'issued', -- issued | revoked
  signature_name text,
  signature_title text,
  custom_fields jsonb not null default '{}'::jsonb,
  design_snapshot jsonb not null default '{}'::jsonb, -- portable for future verify portal
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.certificates enable row level security;
create policy "staff all certificates" on public.certificates
  for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create index certificates_hackathon_idx on public.certificates(hackathon_id);
create index certificates_category_idx on public.certificates(category_id);
create index certificates_recipient_idx on public.certificates(recipient_name);
create index certificates_issue_date_idx on public.certificates(issue_date desc);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger certs_touch before update on public.certificates
  for each row execute function public.touch_updated_at();
create trigger hack_touch before update on public.hackathons
  for each row execute function public.touch_updated_at();

-- Seed default categories
insert into public.award_categories (name, sort_order) values
  ('Winner', 1),
  ('1st Runner-up', 2),
  ('2nd Runner-up', 3),
  ('Best Innovation', 4),
  ('Best Design', 5),
  ('Participation', 99);