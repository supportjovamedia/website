begin;

create table public.service_categories (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses(id),
  name text not null check (length(trim(name)) between 1 and 100),
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  created_at timestamptz not null default now(),
  unique (business_id, id)
);
create unique index service_categories_name_unique on public.service_categories (business_id, lower(trim(name)));
alter table public.service_categories enable row level security;
revoke all on public.service_categories from anon;
grant select, insert, update, delete on public.service_categories to authenticated, service_role;
grant usage, select on sequence public.service_categories_id_seq to authenticated, service_role;
create policy member_read on public.service_categories for select to authenticated
  using (exists (select 1 from public.business_members m where m.business_id=service_categories.business_id and m.user_id=(select auth.uid())));
create policy owner_write on public.service_categories for all to authenticated
  using (exists (select 1 from public.business_members m where m.business_id=service_categories.business_id and m.user_id=(select auth.uid()) and m.role='owner'))
  with check (exists (select 1 from public.business_members m where m.business_id=service_categories.business_id and m.user_id=(select auth.uid()) and m.role='owner'));

alter table public.services add column category_id bigint;
alter table public.services add constraint services_category_business_fk
  foreign key (business_id, category_id) references public.service_categories (business_id, id);
create index services_category_idx on public.services (business_id, category_id);

notify pgrst, 'reload schema';
commit;
