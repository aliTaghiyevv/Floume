create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'florist', 'support', 'admin');
create type public.order_status as enum ('pending_payment', 'paid', 'accepted', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  locale text not null default 'en',
  currency text not null default 'AZN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  country_code text not null, region text, city text not null, street text not null,
  building text not null, apartment text, postal_code text,
  latitude numeric(9,6), longitude numeric(9,6), delivery_notes text,
  created_at timestamptz not null default now()
);
create table public.florists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null, country_code text not null, currency text not null default 'AZN',
  is_published boolean not null default false, created_at timestamptz not null default now()
);
create table public.products (
  id text primary key, florist_id uuid references public.florists(id), slug text not null unique,
  name jsonb not null default '{}'::jsonb, description jsonb not null default '{}'::jsonb,
  image_url text, price_minor integer not null check (price_minor >= 0),
  currency text not null default 'AZN', stock integer not null default 0 check (stock >= 0),
  is_published boolean not null default false, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  currency text not null default 'AZN', updated_at timestamptz not null default now()
);
create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity integer not null check (quantity > 0 and quantity <= 100),
  custom_bouquet jsonb, primary key (cart_id, product_id)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('FL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_id uuid not null references public.profiles(id), florist_id uuid references public.florists(id),
  status public.order_status not null default 'pending_payment', currency text not null,
  subtotal_minor integer not null check (subtotal_minor >= 0), delivery_minor integer not null default 0 check (delivery_minor >= 0),
  tax_minor integer not null default 0 check (tax_minor >= 0), discount_minor integer not null default 0 check (discount_minor >= 0),
  total_minor integer not null check (total_minor >= 0), address_snapshot jsonb not null, items_snapshot jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.order_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status, to_status public.order_status not null, actor_id uuid references public.profiles(id),
  note text, created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null, provider_payment_id text, status public.payment_status not null default 'created',
  amount_minor integer not null check (amount_minor >= 0), currency text not null,
  idempotency_key text not null unique, provider_payload jsonb, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.provider_events (
  provider text not null, event_id text not null, payload jsonb not null, processed_at timestamptz,
  created_at timestamptz not null default now(), primary key (provider, event_id)
);
create index products_published_idx on public.products (is_published, florist_id);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_florist_idx on public.orders (florist_id, status, created_at desc);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.addresses enable row level security;
alter table public.florists enable row level security;
alter table public.products enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.payments enable row level security;
alter table public.provider_events enable row level security;

create or replace function public.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = required_role)
$$;
create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy addresses_self on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy products_public_read on public.products for select using (is_published = true or public.has_role('admin') or exists (select 1 from public.florists f where f.id = florist_id and f.owner_id = auth.uid()));
create policy products_florist_write on public.products for all using (public.has_role('admin') or exists (select 1 from public.florists f where f.id = florist_id and f.owner_id = auth.uid())) with check (public.has_role('admin') or exists (select 1 from public.florists f where f.id = florist_id and f.owner_id = auth.uid()));
create policy carts_self on public.carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_self on public.cart_items for all using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())) with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy orders_customer_read on public.orders for select using (customer_id = auth.uid() or public.has_role('admin') or exists (select 1 from public.florists f where f.id = florist_id and f.owner_id = auth.uid()));
create policy order_events_customer_read on public.order_events for select using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.has_role('admin') or exists (select 1 from public.florists f where f.id = o.florist_id and f.owner_id = auth.uid()))));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
