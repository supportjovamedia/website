begin;
-- Optional, anonymous conversion measurement. Only trusted server code can access it.
create table jovabook_private.funnel_sessions (
 id uuid primary key, cap_hash text not null check(cap_hash ~ '^[a-f0-9]{64}$'),
 revoke_hash text check(revoke_hash ~ '^[a-f0-9]{64}$'),
 client_id text not null check(client_id ~ '^[0-9]{1,20}\.[0-9]{1,20}$'),
 session_id text check(session_id ~ '^[0-9]{1,20}$'),
 created_at timestamptz not null default now(), handoff_until timestamptz not null default now()+interval '15 minutes',
 consent_until timestamptz not null, landed_at timestamptz, revoked_at timestamptz,
 owner_id uuid references auth.users(id) on delete cascade,
 salon_id uuid unique references public.salons(id) on delete cascade,
 initial_plan text not null check(initial_plan in ('essential','standard','premium')),
 initial_cadence text not null check(initial_cadence in ('monthly','annual')),
 campaign jsonb not null default '{}' check(jsonb_typeof(campaign)='object'),
 check(consent_until>created_at and consent_until<=created_at+interval '30 days')
);
create table jovabook_private.funnel_outbox (
 id uuid primary key default gen_random_uuid(), funnel_id uuid not null references jovabook_private.funnel_sessions(id) on delete cascade,
 kind text not null check(kind in ('registration_landing','registered','trial_started','first_paid','paid_candidate')),
 event_key text not null unique, event_time timestamptz not null,
 plan text not null check(plan in ('essential','standard','premium')), cadence text not null check(cadence in ('monthly','annual')),
 value bigint, proof jsonb, transaction_id uuid not null default gen_random_uuid(),
 state text not null default 'pending' check(state in ('pending','sending','sent','dropped')),
 attempts int not null default 0, lease uuid, lease_until timestamptz, available_at timestamptz not null default now(),
 check(value is null or value>0)
);
alter table jovabook_private.funnel_sessions enable row level security;
alter table jovabook_private.funnel_outbox enable row level security;
revoke all on jovabook_private.funnel_sessions,jovabook_private.funnel_outbox from public,anon,authenticated,service_role;
create unique index funnel_outbox_business_event on jovabook_private.funnel_outbox(funnel_id,kind) where kind<>'paid_candidate';
create index funnel_outbox_pending on jovabook_private.funnel_outbox(available_at) where state in ('pending','sending');
create function public.jovabook_funnel_worker(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare f jovabook_private.funnel_sessions; e jovabook_private.funnel_outbox; result jsonb; k text; v text; at_time timestamptz; event_kind text; business public.salons;
begin
 if current_setting('role',true)<>'service_role' then raise exception 'Service access required' using errcode='42501'; end if;
 if jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid payload'; end if;
 if p_action='create' then
  perform pg_advisory_xact_lock(hashtext(coalesce(p_payload->>'client_id','')));
  if (select count(*) from jovabook_private.funnel_sessions where client_id=p_payload->>'client_id' and created_at>now()-interval '1 day')>=10 then return jsonb_build_object('ok',false); end if;
  if (p_payload->>'consent_until')::timestamptz>now()+interval '30 days' or (p_payload->>'consent_until')::timestamptz<=now() then raise exception 'Invalid consent expiry'; end if;
  if jsonb_typeof(coalesce(p_payload->'campaign','{}'))<>'object' then raise exception 'Invalid campaign'; end if;
  for k,v in select key,value from jsonb_each_text(coalesce(p_payload->'campaign','{}')) loop
   if k not in ('source','medium','campaign','content','term') or v!~'^[a-zA-Z0-9_.-]{1,100}$' then raise exception 'Invalid campaign'; end if;
  end loop;
  insert into jovabook_private.funnel_sessions(id,cap_hash,client_id,session_id,consent_until,initial_plan,initial_cadence,campaign)
  values((p_payload->>'id')::uuid,p_payload->>'cap_hash',p_payload->>'client_id',p_payload->>'session_id',(p_payload->>'consent_until')::timestamptz,p_payload->>'initial_plan',coalesce(p_payload->>'cadence',p_payload->>'initial_cadence'),coalesce(p_payload->'campaign','{}'));
  return jsonb_build_object('ok',true);
 elsif p_action in ('land','bind','revoke') then
  select * into f from jovabook_private.funnel_sessions where id=(p_payload->>'id')::uuid and (cap_hash=p_payload->>'cap_hash' or p_action='revoke' and revoke_hash=p_payload->>'cap_hash') for update;
  if not found then return jsonb_build_object('ok',false); end if;
  if p_action='revoke' then
   update jovabook_private.funnel_sessions set revoked_at=coalesce(revoked_at,now()) where id=f.id;
   delete from jovabook_private.funnel_outbox where funnel_id=f.id and state<>'sent';
   return jsonb_build_object('ok',true);
  end if;
  if f.revoked_at is not null or f.consent_until<=now() then return jsonb_build_object('ok',false); end if;
  if p_action='land' then
   if f.landed_at is not null or f.handoff_until<=now() or coalesce(p_payload->>'new_cap_hash','')!~'^[a-f0-9]{64}$' or p_payload->>'new_cap_hash'=f.cap_hash then return jsonb_build_object('ok',false); end if;
   update jovabook_private.funnel_sessions set revoke_hash=cap_hash,cap_hash=p_payload->>'new_cap_hash',landed_at=now() where id=f.id;
   insert into jovabook_private.funnel_outbox(funnel_id,kind,event_key,event_time,plan,cadence)
   values(f.id,'registration_landing','landing:'||f.id,now(),f.initial_plan,f.initial_cadence) on conflict do nothing;
   return jsonb_build_object('ok',true);
  end if;
  if f.landed_at is null then return jsonb_build_object('ok',false); end if;
  select * into business from public.salons where id=(p_payload->>'salon')::uuid and owner_id=(p_payload->>'owner')::uuid;
  if not found or not exists(select 1 from auth.users where id=business.owner_id and email_confirmed_at is not null) or business.created_at<f.created_at then return jsonb_build_object('ok',false); end if;
  if f.salon_id is not null and (f.salon_id<>business.id or f.owner_id<>business.owner_id) then return jsonb_build_object('ok',false); end if;
  if exists(select 1 from jovabook_private.funnel_sessions where salon_id=business.id and id<>f.id) then return jsonb_build_object('ok',false); end if;
  update jovabook_private.funnel_sessions set salon_id=business.id,owner_id=business.owner_id where id=f.id;
  insert into jovabook_private.funnel_outbox(funnel_id,kind,event_key,event_time,plan,cadence)
  values(f.id,'registered','registered:'||business.id,business.created_at,business.plan,f.initial_cadence) on conflict do nothing;
  return jsonb_build_object('ok',true,'bound',true);
 elsif p_action='candidate' then
  at_time:=(p_payload->>'event_time')::timestamptz;
  select * into f from jovabook_private.funnel_sessions where salon_id=(p_payload->>'salon')::uuid for update;
  if not found or f.revoked_at is not null or f.consent_until<=now() or at_time is null or at_time<f.created_at or at_time>now()+interval '5 minutes' or at_time<now()-interval '72 hours'
   or coalesce(p_payload->>'invoice','')!~'^in_[A-Za-z0-9]{1,200}$' or coalesce(p_payload->>'customer','')!~'^cus_[A-Za-z0-9]{1,200}$' or coalesce(p_payload->>'subscription','')!~'^sub_[A-Za-z0-9]{1,200}$'
   or (p_payload->>'trial_end')::timestamptz is null or (p_payload->>'trial_end')::timestamptz>at_time
   or not exists(select 1 from jovabook_private.funnel_outbox where funnel_id=f.id and kind='trial_started' and event_time<=at_time)
   or exists(select 1 from jovabook_private.funnel_outbox where funnel_id=f.id and kind='first_paid') then return jsonb_build_object('ok',false); end if;
  insert into jovabook_private.funnel_outbox(funnel_id,kind,event_key,event_time,plan,cadence,proof)
   values(f.id,'paid_candidate','candidate:'||(p_payload->>'invoice'),at_time,p_payload->>'plan',p_payload->>'cadence',jsonb_build_object('invoice',p_payload->>'invoice','customer',p_payload->>'customer','subscription',p_payload->>'subscription','trial_end',p_payload->>'trial_end')) on conflict do nothing returning * into e;
  return jsonb_build_object('ok',true,'queued',e.id is not null,'id',e.id);
 elsif p_action='enqueue' then
  event_kind:=p_payload->>'kind';at_time:=(p_payload->>'event_time')::timestamptz;
  if event_kind not in ('registered','trial_started','first_paid') or at_time is null or at_time>now()+interval '5 minutes' or at_time<now()-interval '72 hours' or length(coalesce(p_payload->>'key','')) not between 1 and 200 then return jsonb_build_object('ok',false); end if;
  select * into f from jovabook_private.funnel_sessions where salon_id=(p_payload->>'salon')::uuid for update;
  if not found or f.revoked_at is not null or f.consent_until<=now() or at_time<f.created_at then return jsonb_build_object('ok',false); end if;
  if event_kind='first_paid' and (coalesce((p_payload->>'value')::numeric,0)<=0 or (p_payload->>'value')::numeric<>trunc((p_payload->>'value')::numeric) or not exists(select 1 from jovabook_private.funnel_outbox where funnel_id=f.id and kind='trial_started' and event_time<=at_time)) then return jsonb_build_object('ok',false); end if;
  insert into jovabook_private.funnel_outbox(funnel_id,kind,event_key,event_time,plan,cadence,value)
  values(f.id,event_kind,p_payload->>'key',at_time,p_payload->>'plan',p_payload->>'cadence',case when event_kind='first_paid' then (p_payload->>'value')::numeric else null end) on conflict do nothing returning * into e;
  return jsonb_build_object('ok',true,'queued',e.id is not null,'id',e.id);
 elsif p_action='claim' then
  -- Short retention, bounded retries, no artificial timestamp refresh of old events.
  delete from jovabook_private.funnel_sessions where consent_until<now()-interval '1 day';
  update jovabook_private.funnel_outbox o set state='dropped',lease=null,lease_until=null
   where state in ('pending','sending') and ((attempts>=5 and (state='pending' or lease_until<now())) or event_time<now()-interval '72 hours' or exists(select 1 from jovabook_private.funnel_sessions s where s.id=o.funnel_id and (s.revoked_at is not null or s.consent_until<=now())));
  with candidates as (
   select o.id from jovabook_private.funnel_outbox o join jovabook_private.funnel_sessions s on s.id=o.funnel_id
   where o.state in ('pending','sending') and (o.state='pending' or o.lease_until<now()) and o.available_at<=now() and o.attempts<5 and o.event_time>=now()-interval '72 hours' and s.revoked_at is null and s.consent_until>now()
   order by o.event_time limit 5 for update of o skip locked
  ),claimed as (
   update jovabook_private.funnel_outbox o set state='sending',attempts=o.attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '2 minutes' from candidates c where o.id=c.id returning o.*
  ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'salon',s.salon_id,'lease',c.lease,'kind',c.kind,'event_time',c.event_time,'plan',c.plan,'cadence',c.cadence,'value',c.value,'transaction_id',c.transaction_id,'client_id',s.client_id,'session_id',s.session_id,'initial_plan',s.initial_plan,'initial_cadence',s.initial_cadence,'campaign',s.campaign,'proof',case when c.kind='paid_candidate' then c.proof else null end)),'[]') into result from claimed c join jovabook_private.funnel_sessions s on s.id=c.funnel_id;
  return result;
 elsif p_action='authorize' then
  select o.* into e from jovabook_private.funnel_outbox o join jovabook_private.funnel_sessions s on s.id=o.funnel_id where o.id=(p_payload->>'id')::uuid and o.lease=(p_payload->>'lease')::uuid and o.state='sending' and o.lease_until>now() and s.revoked_at is null and s.consent_until>now() and o.event_time>=now()-interval '72 hours';
  return jsonb_build_object('ok',found);
 elsif p_action='finish' then
  update jovabook_private.funnel_outbox set state=case when (p_payload->>'ok')::boolean then 'sent' when attempts>=5 then 'dropped' else 'pending' end,available_at=now()+interval '5 minutes',lease=null,lease_until=null
   where id=(p_payload->>'id')::uuid and lease=(p_payload->>'lease')::uuid and state='sending';
  return jsonb_build_object('ok',found);
 else raise exception 'Unknown funnel action'; end if;
end$$;
revoke all on function public.jovabook_funnel_worker(text,jsonb) from public,anon,authenticated;
grant execute on function public.jovabook_funnel_worker(text,jsonb) to service_role;
commit;
