create table public.fare_override_audit (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null,
  action text not null check (action in ('upsert','delete')),
  changed_by uuid not null,
  changed_by_email text,
  before_values jsonb,
  after_values jsonb,
  changed_fields text[],
  created_at timestamptz not null default now()
);

create index fare_override_audit_city_idx on public.fare_override_audit (city_slug, created_at desc);

alter table public.fare_override_audit enable row level security;

create policy "Admins can view audit log"
  on public.fare_override_audit for select
  using (public.has_role(auth.uid(), 'admin'));