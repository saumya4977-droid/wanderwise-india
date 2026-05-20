create table public.fare_overrides (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null unique,
  auto_base numeric,
  auto_per_km numeric,
  taxi_base numeric,
  taxi_per_km numeric,
  bus_min numeric,
  bus_max numeric,
  peak_multiplier numeric,
  night_multiplier numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fare_overrides enable row level security;

create policy "Overrides are viewable by everyone"
  on public.fare_overrides for select using (true);

create policy "Admins can insert overrides"
  on public.fare_overrides for insert
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update overrides"
  on public.fare_overrides for update
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete overrides"
  on public.fare_overrides for delete
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_fare_overrides_updated
  before update on public.fare_overrides
  for each row execute function public.touch_updated_at();