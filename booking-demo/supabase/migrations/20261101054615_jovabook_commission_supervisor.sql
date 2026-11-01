-- Source support only. Network-free due queue and both supervisor gates start off.
begin;
alter table jovabook_private.commission_config add column supervisor_enabled boolean not null default false,
 add column supervisor_operational_ready boolean not null default false,
 add column supervisor_http_hash text check(supervisor_http_hash is null or supervisor_http_hash~'^[0-9a-f]{64}$');
create table jovabook_private.commission_refresh_jobs(
 salon_id uuid primary key references public.salons(id) on delete cascade,
 next_refresh_at timestamptz not null default clock_timestamp(),lease uuid,lease_until timestamptz,
 attempts bigint not null default 0,failures int not null default 0 check(failures between 0 and 16),
 last_attempt_at timestamptz,last_success_at timestamptz,last_outcome text check(last_outcome in('refreshed','pending','retry')),
 check((lease is null)=(lease_until is null)));
create index commission_refresh_due on jovabook_private.commission_refresh_jobs(next_refresh_at,lease_until);
alter table jovabook_private.commission_refresh_jobs enable row level security;
revoke all on jovabook_private.commission_refresh_jobs from public,anon,authenticated;

do $$declare source text;begin
 source:=pg_get_functiondef('public.booking_commission_worker(text,text,jsonb)'::regprocedure);
 execute replace(source,'public.booking_commission_worker(','jovabook_private.commission_worker_before_supervisor(');
end$$;
revoke all on function jovabook_private.commission_worker_before_supervisor(text,text,jsonb) from public,anon,authenticated;
create or replace function public.booking_commission_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg jovabook_private.commission_config;job jovabook_private.commission_refresh_jobs;candidate record;boundary timestamptz;pending boolean;begin
 if p_action not in('supervisor_claim','supervisor_finish') then return jovabook_private.commission_worker_before_supervisor(p_token,p_action,p_payload);end if;
 select * into cfg from jovabook_private.commission_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or cfg.worker_hash is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>cfg.worker_hash then raise exception 'Invalid commission worker.' using errcode='42501';end if;
 if p_action='supervisor_claim' then
  if not cfg.enabled or cfg.enabled_at is null or not cfg.supervisor_enabled or cfg.supervisor_http_hash is null or cfg.supervisor_http_hash=cfg.worker_hash or p_payload->>'http_hash' is distinct from cfg.supervisor_http_hash or not exists(select 1 from jovabook_private.billing_config where singleton and enabled and provider_configured and worker_hash is not null) then return jsonb_build_object('enabled',false,'job',null);end if;
  for candidate in select a.salon_id from jovabook_private.billing_accounts a left join jovabook_private.commission_refresh_jobs j on j.salon_id=a.salon_id
   where a.ever_paid and a.deletion_state is null and a.customer_id~'^cus_[A-Za-z0-9]+$' and a.subscription_id~'^sub_[A-Za-z0-9]+$'
    and jovabook_private.commission_terms_current(a.commission_terms_version) and a.commission_terms_accepted_at is not null
    and (j.next_refresh_at is null or j.next_refresh_at<=clock_timestamp()) and (j.lease_until is null or j.lease_until<=clock_timestamp())
   order by coalesce(j.next_refresh_at,'-infinity'::timestamptz),coalesce(j.last_attempt_at,a.registered_at),a.salon_id limit 100
  loop
   -- Use the same advisory-first lock order as staff, billing and the ledger.
   if not pg_try_advisory_xact_lock(hashtext('jovabook-owner:'||candidate.salon_id::text)) then continue;end if;
   if not exists(select 1 from jovabook_private.billing_accounts a where a.salon_id=candidate.salon_id and a.ever_paid and a.deletion_state is null and a.customer_id~'^cus_[A-Za-z0-9]+$' and a.subscription_id~'^sub_[A-Za-z0-9]+$' and jovabook_private.commission_terms_current(a.commission_terms_version) and a.commission_terms_accepted_at is not null) then continue;end if;
   insert into jovabook_private.commission_refresh_jobs(salon_id) values(candidate.salon_id) on conflict do nothing;
   select * into job from jovabook_private.commission_refresh_jobs where salon_id=candidate.salon_id for update skip locked;
   if job.salon_id is null or job.next_refresh_at>clock_timestamp() or job.lease_until>clock_timestamp() then continue;end if;
   update jovabook_private.commission_refresh_jobs set lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '10 minutes',attempts=attempts+1,last_attempt_at=clock_timestamp() where salon_id=job.salon_id returning * into job;
   return jsonb_build_object('enabled',true,'job',jsonb_build_object('salon_id',job.salon_id,'lease',job.lease,'lease_until',job.lease_until));
  end loop;
  return jsonb_build_object('enabled',true,'job',null);
 end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||coalesce(p_payload->>'salon','')));
 select * into job from jovabook_private.commission_refresh_jobs where salon_id=(p_payload->>'salon')::uuid for update;
 if job.salon_id is null or job.lease is distinct from (p_payload->>'lease')::uuid or job.lease_until<=clock_timestamp() then return jsonb_build_object('ok',false,'stale',true);end if;
 if jsonb_typeof(p_payload->'ok') is distinct from 'boolean' then raise exception 'A verified refresh outcome is required.';end if;
 if (p_payload->>'ok')::boolean then
  select period_end into boundary from jovabook_private.commission_periods where salon_id=job.salon_id;
  pending:=jovabook_private.billing_customer_pending(job.salon_id);
  update jovabook_private.commission_refresh_jobs set lease=null,lease_until=null,failures=0,last_success_at=clock_timestamp(),last_outcome=case when pending then 'pending' else 'refreshed' end,
   next_refresh_at=case when pending then clock_timestamp()+interval '5 minutes' when boundary>clock_timestamp() then least(clock_timestamp()+interval '12 hours',boundary+interval '1 minute') else clock_timestamp()+interval '12 hours' end where salon_id=job.salon_id;
 else
  update jovabook_private.commission_refresh_jobs set lease=null,lease_until=null,failures=least(failures+1,16),last_outcome='retry',
   next_refresh_at=clock_timestamp()+make_interval(secs=>least(21600,300*power(2,least(failures,7)))::int) where salon_id=job.salon_id;
 end if;
 return jsonb_build_object('ok',true);
end$$;
revoke all on function public.booking_commission_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_commission_worker(text,text,jsonb) to anon,authenticated;

notify pgrst,'reload schema';
commit;
