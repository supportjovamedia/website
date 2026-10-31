-- Request-only plan changes. Apply after migration_owner_experience.sql.
-- No billing provider is connected. These RPCs never activate a plan or charge money.
begin;

create table public.subscription_change_requests (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  from_plan text not null check (from_plan in ('essential','standard','premium')),
  to_plan text not null check (to_plan in ('essential','standard','premium')),
  status text not null default 'pending' check (status in ('pending','cancelled','applied','rejected')),
  requested_at timestamptz not null default now(),
  constraint subscription_change_different_plan check (from_plan<>to_plan)
);
create unique index subscription_change_one_pending on public.subscription_change_requests(salon_id) where status='pending';
create index subscription_change_history on public.subscription_change_requests(salon_id,requested_at desc);
alter table public.subscription_change_requests enable row level security;
create policy "owner reads own subscription requests" on public.subscription_change_requests
  for select to authenticated using (exists(select 1 from public.salons s where s.id=salon_id and s.owner_id=auth.uid()));
revoke all on table public.subscription_change_requests from public,anon,authenticated;
grant select on table public.subscription_change_requests to authenticated;

create function public.owner_subscription()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.salons; pending jsonb; roster int;
begin
  select * into s from public.salons where owner_id=auth.uid();
  if s.id is null then raise exception 'Sign in as the salon owner.' using errcode='42501'; end if;
  select count(*) into roster from public.staff where salon_id=s.id;
  select jsonb_build_object('id',r.id,'from_plan',r.from_plan,'to_plan',r.to_plan,'status',r.status,'requested_at',r.requested_at)
    into pending from public.subscription_change_requests r where r.salon_id=s.id and r.status='pending';
  return jsonb_build_object('plan',s.plan,'staff_limit',public.plan_staff_limit(s.plan),'staff_count',roster,
    'billing_connected',false,'pending_request',pending,'changes_supported',true);
end $$;

create function public.request_plan_change(p_target text,p_salon uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.salons; target text:=lower(trim(coalesce(p_target,''))); roster int; existing public.subscription_change_requests;
begin
  select * into s from public.salons where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Sign in as the salon owner.' using errcode='42501'; end if;
  if p_salon is null or p_salon<>s.id then raise exception 'Your salon changed. Open subscription settings again.' using errcode='42501'; end if;
  if target not in ('essential','standard','premium') then raise exception 'Choose Essential, Standard or Premium.' using errcode='23514'; end if;
  if target=s.plan then raise exception 'Your salon is already on this plan.' using errcode='23514'; end if;
  select count(*) into roster from public.staff where salon_id=s.id;
  if roster>public.plan_staff_limit(target) then
    raise exception 'This plan allows % staff member(s). Remove unused staff in Staff settings before requesting this change. Inactive staff also count.',public.plan_staff_limit(target) using errcode='23514';
  end if;
  select * into existing from public.subscription_change_requests where salon_id=s.id and status='pending';
  if existing.id is not null and existing.to_plan=target then return public.owner_subscription()||jsonb_build_object('ok',true); end if;
  update public.subscription_change_requests set status='cancelled' where salon_id=s.id and status='pending';
  insert into public.subscription_change_requests(salon_id,requested_by,from_plan,to_plan) values(s.id,auth.uid(),s.plan,target);
  return public.owner_subscription()||jsonb_build_object('ok',true);
end $$;

create function public.cancel_plan_change(p_id uuid,p_salon uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.salons; cancelled uuid;
begin
  select * into s from public.salons where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Sign in as the salon owner.' using errcode='42501'; end if;
  if p_salon is null or p_salon<>s.id then raise exception 'Your salon changed. Open subscription settings again.' using errcode='42501'; end if;
  update public.subscription_change_requests set status='cancelled'
    where id=p_id and salon_id=s.id and requested_by=auth.uid() and status='pending' returning id into cancelled;
  if cancelled is null then raise exception 'This pending request is no longer available. Refresh subscription settings.' using errcode='23514'; end if;
  return public.owner_subscription()||jsonb_build_object('ok',true);
end $$;

revoke all on function public.owner_subscription(),public.request_plan_change(text,uuid),public.cancel_plan_change(uuid,uuid) from public,anon,authenticated;
grant execute on function public.owner_subscription(),public.request_plan_change(text,uuid),public.cancel_plan_change(uuid,uuid) to authenticated;
commit;
