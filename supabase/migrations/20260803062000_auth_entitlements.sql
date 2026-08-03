create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  status text not null default 'inactive' check (status in ('active', 'inactive', 'refunded', 'revoked')),
  provider text,
  provider_customer_id text,
  provider_payment_id text,
  purchased_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;

create policy "users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);

create policy "users can read own entitlements"
on public.entitlements for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- After the owner account is registered, grant owner role from the SQL editor:
-- update public.profiles set role = 'owner' where user_id = '<OWNER_USER_UUID>';
