-- Country activation is a server-controlled release gate.
create table public.launch_countries (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  locale text not null,
  tax_rate_basis_points integer not null default 0 check (tax_rate_basis_points between 0 and 10000),
  payments_enabled boolean not null default false,
  orders_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  check (not orders_enabled or payments_enabled)
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  florist_id uuid not null references public.florists(id) on delete cascade,
  country_code text not null references public.launch_countries(country_code),
  city text not null,
  postal_prefix text,
  fee_minor integer not null check (fee_minor >= 0),
  is_active boolean not null default false,
  unique (florist_id, country_code, city, postal_prefix)
);
create table public.delivery_slots (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.delivery_zones(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= capacity),
  check (ends_at > starts_at),
  unique (zone_id, starts_at, ends_at)
);
create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity integer not null check (quantity > 0),
  expires_at timestamptz not null,
  released_at timestamptz,
  consumed_at timestamptz,
  check (released_at is null or consumed_at is null),
  unique (order_id, product_id)
);
alter table public.orders add column delivery_slot_id uuid references public.delivery_slots(id);
alter table public.orders add column reservation_expires_at timestamptz;
alter table public.orders add column idempotency_key text unique;
alter table public.orders add constraint orders_total_matches_parts
  check (total_minor = subtotal_minor + delivery_minor + tax_minor - discount_minor);
create index reservations_active_idx on public.inventory_reservations (expires_at)
  where released_at is null and consumed_at is null;

create table public.wishlist_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create table public.saved_bouquets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  design jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  country_code text not null references public.launch_countries(country_code),
  discount_minor integer not null check (discount_minor > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  usage_limit integer not null check (usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0 and used_count <= usage_limit),
  is_active boolean not null default false,
  check (ends_at > starts_at)
);
create table public.promotion_redemptions (
  promotion_id uuid not null references public.promotions(id),
  order_id uuid not null unique references public.orders(id),
  user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (promotion_id, order_id)
);
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  amount_minor integer not null check (amount_minor > 0),
  status text not null check (status in ('requested', 'processing', 'succeeded', 'failed')),
  provider_refund_id text,
  requested_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.substitutions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  proposed_by uuid not null references public.profiles(id),
  original_item jsonb not null,
  proposed_item jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  status text not null,
  proof_path text,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now()
);
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  order_id uuid references public.orders(id),
  subject text not null,
  status text not null default 'open' check (status in ('open', 'waiting', 'resolved')),
  created_at timestamptz not null default now()
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  kind text not null check (kind in ('chat', 'image')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  storage_path text,
  attempts integer not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.launch_countries enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.delivery_slots enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.saved_bouquets enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.refunds enable row level security;
alter table public.substitutions enable row level security;
alter table public.delivery_events enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_events enable row level security;
alter table public.ai_jobs enable row level security;

create policy launch_countries_read on public.launch_countries for select using (true);
create policy florists_public_read on public.florists for select
  using (is_published or owner_id = auth.uid() or public.has_role('admin'));
create policy zones_public_read on public.delivery_zones for select
  using (is_active or public.has_role('admin') or exists
    (select 1 from public.florists f where f.id = florist_id and f.owner_id = auth.uid()));
create policy slots_public_read on public.delivery_slots for select
  using (exists (select 1 from public.delivery_zones z where z.id = zone_id and z.is_active));
create policy wishlist_self on public.wishlist_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_bouquets_self on public.saved_bouquets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_self_read on public.notifications for select using (user_id = auth.uid());
create policy support_tickets_self_read on public.support_tickets for select
  using (user_id = auth.uid() or public.has_role('support') or public.has_role('admin'));
create policy support_tickets_self_insert on public.support_tickets for insert
  with check (user_id = auth.uid() and (order_id is null or exists
    (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())));
create policy ai_jobs_self_read on public.ai_jobs for select using (user_id = auth.uid());
create policy substitutions_participant_read on public.substitutions for select using
  (exists (select 1 from public.orders o where o.id = order_id and
    (o.customer_id = auth.uid() or public.has_role('admin') or exists
      (select 1 from public.florists f where f.id = o.florist_id and f.owner_id = auth.uid()))));
create policy delivery_events_participant_read on public.delivery_events for select using
  (exists (select 1 from public.orders o where o.id = order_id and
    (o.customer_id = auth.uid() or public.has_role('admin') or exists
      (select 1 from public.florists f where f.id = o.florist_id and f.owner_id = auth.uid()))));
