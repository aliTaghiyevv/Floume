-- Azerbaijan is the first market, but stays disabled until all release gates pass.
insert into public.launch_countries (country_code, currency, locale, tax_rate_basis_points, payments_enabled, orders_enabled)
values ('AZ', 'AZN', 'az', 0, false, false)
on conflict (country_code) do nothing;

-- The country switch is server-controlled; authenticated clients may only read it.
revoke insert, update, delete on public.launch_countries from authenticated;

create index if not exists order_events_order_created_idx on public.order_events (order_id, created_at desc);
create index if not exists provider_events_unprocessed_idx on public.provider_events (provider, processed_at) where processed_at is null;
