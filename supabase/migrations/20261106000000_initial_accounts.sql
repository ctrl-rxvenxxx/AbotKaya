create table if not exists public.app_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin'))
);

create table if not exists public.account_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  disabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;
alter table public.user_roles enable row level security;
alter table public.account_status enable row level security;

revoke all on table public.app_data from anon, authenticated;
grant select, insert, update on table public.app_data to authenticated;
revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.account_status from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.account_status
    where user_id = (select auth.uid())
      and disabled
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_account_active() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_account_active() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_data (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  insert into public.account_status (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Users can read their own app data" on public.app_data;
create policy "Users can read their own app data"
  on public.app_data for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_account_active()));

drop policy if exists "Users can create their own app data" on public.app_data;
create policy "Users can create their own app data"
  on public.app_data for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_account_active()));

drop policy if exists "Users can update their own app data" on public.app_data;
create policy "Users can update their own app data"
  on public.app_data for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_account_active()))
  with check ((select auth.uid()) = user_id and (select public.is_account_active()));

drop trigger if exists on_auth_user_created_create_app_data on auth.users;
create trigger on_auth_user_created_create_app_data
  after insert on auth.users
  for each row execute function public.handle_new_user();
