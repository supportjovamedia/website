-- BYO credentials are encrypted by the server, never salon.settings or browser data.
-- This migration is inert until an administrator separately configures both flags.
create table jovabook_private.integration_config(
 singleton boolean primary key default true check(singleton),worker_hash text,
 enabled boolean not null default false,recovery_enabled boolean not null default false
);
insert into jovabook_private.integration_config(singleton) values(true);
create table jovabook_private.business_integrations(
 salon_id uuid not null references public.salons(id) on delete cascade,
 provider text not null check(provider in('stripe','paypal','mailchimp','sms_works','twilio')),
 revision uuid not null default gen_random_uuid(),encrypted jsonb not null,
 summary jsonb not null,verified_at timestamptz not null default now(),
 primary key(salon_id,provider),check(jsonb_typeof(encrypted)='object' and encrypted->>'v'='1')
);
create table jovabook_private.recovery_previews(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null references public.salons(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,booking_id text not null,
 revision uuid not null,fingerprint text not null,candidates jsonb not null,
 expires_at timestamptz not null default now()+interval '5 minutes'
);
create table jovabook_private.recovery_dispatches(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null references public.salons(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,booking_id text not null,
 request_id uuid not null,request_hash text not null,revision uuid not null,fingerprint text not null,
 context jsonb not null,recipients jsonb not null,include_offer boolean not null,discount_percent int not null check(discount_percent between 0 and 100),
 stage text not null default 'queued' check(stage in('queued','preparing','creating_segment','segment_saved','creating_campaign','campaign_saved','sending','unknown','sent','cancelled','needs_attention')),
 segment_id bigint,campaign_id text,lease uuid,lease_until timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(salon_id,request_id),unique(salon_id,booking_id)
);
do $$declare t text;begin foreach t in array array['integration_config','business_integrations','recovery_previews','recovery_dispatches'] loop
 execute format('alter table jovabook_private.%I enable row level security',t);
 execute format('revoke all on jovabook_private.%I from public,anon,authenticated',t);
end loop;end$$;

create function jovabook_private.integration_owner(p_salon uuid,p_user uuid,p_write boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.salons s join auth.users u on u.id=s.owner_id
 where s.id=p_salon and u.id=p_user and u.email_confirmed_at is not null
 and (not p_write or jovabook_private.billing_open(s.id)))
$$;
revoke all on function jovabook_private.integration_owner(uuid,uuid,boolean) from public,anon,authenticated;

-- Only actual completed visits in the preceding 75 local calendar days qualify.
-- No booking/contact address is treated as marketing permission here.
create function jovabook_private.recovery_context(p_salon uuid,p_user uuid,p_booking text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare s public.salons;b public.bookings;svc public.services;c jovabook_private.business_integrations;
 a jovabook_private.billing_accounts;slot jsonb;business jsonb;people jsonb;zone text;local_now timestamp;
begin
 if not jovabook_private.integration_owner(p_salon,p_user,true) then return null;end if;
 select * into a from jovabook_private.billing_accounts where salon_id=p_salon;
 if not a.ever_paid or a.paid_plan not in('standard','premium') then return null;end if;
 select * into s from public.salons where id=p_salon;
 select * into b from public.bookings where salon_id=p_salon and id=p_booking;
 select * into svc from public.services where salon_id=p_salon and id=b.service_id;
 select * into c from jovabook_private.business_integrations where salon_id=p_salon and provider='mailchimp';
 if s.status not in('active','trialing') or b.id is null or b.status<>'cancelled' or svc.id is null or c.salon_id is null or coalesce(s.phone,'') !~ '^[+0-9 ()-]{7,40}$' or length(regexp_replace(s.phone,'[^0-9]','','g')) not between 7 and 15 then return null;end if;
 zone:=coalesce(nullif(s.settings->>'timezone',''),'Europe/London');
 if not exists(select 1 from pg_timezone_names where name=zone) then zone:='Europe/London';end if;
 local_now:=now() at time zone zone;
 if b.date<local_now::date or b.date>local_now::date+75 or b.date+b.time::time<=local_now or not public.slot_free(p_salon,b.staff_id,b.date,b.time,b.duration,b.id) then return null;end if;
 slot:=jsonb_build_object('booking_id',b.id,'service_id',svc.id,'service',b.service_name,'date',b.date,'time',b.time,'duration',b.duration,'staff_id',b.staff_id);
 business:=jsonb_build_object('name',s.name,'phone',s.phone,'timezone',zone);
 select coalesce(jsonb_agg(to_jsonb(x) order by x.rank,x.id),'[]') into people from (select * from (
  select distinct on(lower(trim(cu.email))) cu.id,cu.name,lower(trim(cu.email)) email,
   min(case when v.service_id=b.service_id then 0 else 1 end) rank,
   case when bool_or(v.service_id=b.service_id) then 'same_service' else 'same_category' end match_reason
  from public.customers cu join public.bookings v on v.salon_id=cu.salon_id and lower(trim(v.email))=lower(trim(cu.email))
   join public.services past on past.salon_id=v.salon_id and past.id=v.service_id
  where cu.salon_id=p_salon and cu.id<>b.customer_id and lower(trim(cu.email))<>lower(trim(b.email))
   and cu.email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'
   and v.status='completed' and v.date between local_now::date-75 and local_now::date
   and v.date+v.time::time between local_now-interval '75 days' and local_now
   and (v.service_id=b.service_id or svc.category_id<>'' and past.category_id=svc.category_id)
  group by cu.id,cu.name,cu.email order by lower(trim(cu.email)),cu.id
 ) all_people order by rank,id limit 100) x;
 return jsonb_build_object('slot',slot,'business',business,'candidates',people,
  'connection',to_jsonb(c),'fingerprint',encode(sha256(convert_to(jsonb_build_object('slot',slot,'business',business,'revision',c.revision)::text,'UTF8')),'hex'));
end$$;
revoke all on function jovabook_private.recovery_context(uuid,uuid,text) from public,anon,authenticated;

-- Anon can execute only this token-protected worker gateway, not private tables.
-- User IDs are supplied only after server /auth/v1/user and owner_account_access.
create function public.business_integrations_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare cfg jovabook_private.integration_config;s uuid;u uuid;v_provider text;current_context jsonb;
 conn jovabook_private.business_integrations;preview jovabook_private.recovery_previews;
 job jovabook_private.recovery_dispatches;outbox jsonb:='[]';chosen jsonb;next_stage text;candidate record;
begin
 select * into cfg from jovabook_private.integration_config where singleton;
 if cfg.worker_hash is null or p_token is null or length(p_token)<>64 or cfg.worker_hash<>encode(sha256(convert_to(p_token,'UTF8')),'hex') then raise exception 'Invalid integration worker.' using errcode='42501';end if;
 if p_action='health' then return jsonb_build_object('enabled',cfg.enabled and cfg.recovery_enabled);end if;
 if p_action in('list','status','connect','disconnect','recovery_context','preview','enqueue') then
  s:=(p_payload->>'salon_id')::uuid;u:=(p_payload->>'user_id')::uuid;
  if not jovabook_private.integration_owner(s,u,p_action not in('list','status','disconnect')) then raise exception 'Business access denied.' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||s::text));
  if not jovabook_private.integration_owner(s,u,p_action not in('list','status','disconnect')) then raise exception 'Business access changed.' using errcode='42501';end if;
  if p_action='disconnect' then
   v_provider:=p_payload->>'provider';
   select * into conn from jovabook_private.business_integrations where salon_id=s and provider=v_provider;
   if conn.revision is distinct from (p_payload->>'expected_revision')::uuid then raise exception 'Connection changed.';end if;
   update jovabook_private.recovery_dispatches set stage=case when stage in('sending','unknown') then 'needs_attention' else 'cancelled' end,lease=null,lease_until=null,updated_at=now()
    where salon_id=s and v_provider='mailchimp' and stage not in('sent','cancelled','needs_attention');
   delete from jovabook_private.business_integrations where salon_id=s and business_integrations.provider=v_provider;
   delete from jovabook_private.recovery_previews where salon_id=s and v_provider='mailchimp';
   return jsonb_build_object('ok',true);
  end if;
  if not cfg.enabled then raise exception 'Integrations are not enabled.' using errcode='42501';end if;
  if p_action='list' then return (select coalesce(jsonb_agg(to_jsonb(c)),'[]') from jovabook_private.business_integrations c where salon_id=s);end if;
  if p_action='status' then return jsonb_build_object('integrations',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from jovabook_private.business_integrations c where salon_id=s),
   'recovery_enabled',cfg.recovery_enabled,'recovery_eligible',exists(select 1 from jovabook_private.billing_accounts a where a.salon_id=s and a.ever_paid and a.paid_plan in('standard','premium') and jovabook_private.billing_open(s)),
   'actions',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select id,booking_id,stage,created_at,updated_at from jovabook_private.recovery_dispatches where salon_id=s order by created_at desc limit 20) x));end if;
  if p_action='connect' then
   v_provider:=p_payload->>'provider';
   select * into conn from jovabook_private.business_integrations where salon_id=s and provider=v_provider;
   if conn.revision is distinct from (p_payload->>'expected_revision')::uuid then raise exception 'Connection changed.';end if;
   -- Replace only after server verification. Revisions invalidate outstanding previews.
   insert into jovabook_private.business_integrations(salon_id,provider,encrypted,summary) values(s,v_provider,p_payload->'encrypted',p_payload->'summary')
    on conflict(salon_id,provider) do update set encrypted=excluded.encrypted,summary=excluded.summary,revision=gen_random_uuid(),verified_at=now() returning * into conn;
   return jsonb_build_object('revision',conn.revision);
  end if;
  if not cfg.recovery_enabled then raise exception 'Recovery is not enabled.' using errcode='42501';end if;
  if p_action='recovery_context' then return jovabook_private.recovery_context(s,u,p_payload->>'booking_id');end if;
  if p_action='preview' then
   current_context:=jovabook_private.recovery_context(s,u,p_payload->>'booking_id');
   if current_context is null or current_context->>'fingerprint'<>p_payload->>'fingerprint' or current_context->'connection'->>'revision'<>p_payload->>'revision' then raise exception 'This slot has changed.';end if;
   if jsonb_typeof(p_payload->'candidates')<>'array' or jsonb_array_length(p_payload->'candidates')>100 or exists(select 1 from jsonb_array_elements(p_payload->'candidates') x where not current_context->'candidates' @> jsonb_build_array(x)) then raise exception 'Invalid recovery audience.';end if;
   delete from jovabook_private.recovery_previews where expires_at<now();
   insert into jovabook_private.recovery_previews(salon_id,user_id,booking_id,revision,fingerprint,candidates) values(s,u,p_payload->>'booking_id',(p_payload->>'revision')::uuid,p_payload->>'fingerprint',p_payload->'candidates') returning * into preview;
   return jsonb_build_object('id',preview.id,'expires_at',preview.expires_at);
  end if;
  if p_action='enqueue' then
   select * into job from jovabook_private.recovery_dispatches where salon_id=s and request_id=(p_payload->>'request_id')::uuid;
   if job.id is not null then
    if job.user_id<>u or job.request_hash<>p_payload->>'request_hash' then raise exception 'Recovery request changed.';end if;
    return jsonb_build_object('id',job.id,'status',job.stage);
   end if;
   select * into preview from jovabook_private.recovery_previews where id=(p_payload->>'preview_id')::uuid and salon_id=s and user_id=u and expires_at>now();
   current_context:=jovabook_private.recovery_context(s,u,preview.booking_id);
   if preview.id is null or current_context is null or current_context->>'fingerprint'<>preview.fingerprint then raise exception 'Refresh this recovery preview before sending.';end if;
   select jsonb_agg(x) into chosen from jsonb_array_elements(preview.candidates) x where p_payload->'recipient_ids' @> jsonb_build_array(x->>'id');
   if chosen is null or jsonb_array_length(chosen)<>jsonb_array_length(p_payload->'recipient_ids') or jsonb_array_length(chosen)>100 then raise exception 'Choose eligible recipients.';end if;
   if exists(select 1 from jsonb_array_elements(chosen) x where not current_context->'candidates' @> jsonb_build_array(x)) then raise exception 'This audience has changed.';end if;
   insert into jovabook_private.recovery_dispatches(salon_id,user_id,booking_id,request_id,request_hash,revision,fingerprint,context,recipients,include_offer,discount_percent)
    values(s,u,preview.booking_id,(p_payload->>'request_id')::uuid,p_payload->>'request_hash',preview.revision,preview.fingerprint,current_context-'candidates'-'connection',chosen,(p_payload->>'include_offer')::boolean,(p_payload->>'discount_percent')::int) returning * into job;
   return jsonb_build_object('id',job.id,'status',job.stage);
  end if;
 end if;
 if p_action='claim' then
  if not cfg.enabled or not cfg.recovery_enabled then return '[]';end if;
  for candidate in select id,salon_id from jovabook_private.recovery_dispatches where stage not in('sent','cancelled','needs_attention') and (lease_until is null or lease_until<now()) order by created_at limit 1 loop
   perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||candidate.salon_id::text));
   select * into job from jovabook_private.recovery_dispatches where id=candidate.id for update skip locked;
   if job.id is null or job.stage in('sent','cancelled','needs_attention') or job.lease_until>now() then continue;end if;
   select * into conn from jovabook_private.business_integrations where salon_id=job.salon_id and provider='mailchimp' and revision=job.revision;
   if conn.salon_id is null then update jovabook_private.recovery_dispatches set stage='needs_attention' where id=job.id;continue;end if;
   next_stage:=case when job.stage='queued' then 'preparing' when job.campaign_id is not null then 'unknown' else 'needs_attention' end;
   update jovabook_private.recovery_dispatches set stage=next_stage,lease=gen_random_uuid(),lease_until=now()+interval '10 minutes',updated_at=now() where id=job.id returning * into job;
   if next_stage<>'needs_attention' then outbox:=outbox||jsonb_build_array(to_jsonb(job)||jsonb_build_object('connection',to_jsonb(conn)));end if;
  end loop;return outbox;
 end if;
 if p_action in('prepare','advance','unknown') then
  select salon_id into s from jovabook_private.recovery_dispatches where id=(p_payload->>'id')::uuid;
  if s is null then raise exception 'Recovery action unavailable.';end if;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||s::text));
  select * into job from jovabook_private.recovery_dispatches where id=(p_payload->>'id')::uuid for update;
  if job.lease is distinct from (p_payload->>'lease')::uuid or job.lease_until<now() or job.stage in('sent','cancelled','needs_attention') then raise exception 'Recovery lease changed.';end if;
  if p_action='unknown' then
   update jovabook_private.recovery_dispatches set stage=case when campaign_id is not null then 'unknown' else 'needs_attention' end,lease=null,lease_until=now()+interval '1 minute',updated_at=now() where id=job.id;return 'true';
  end if;
  if p_action='prepare' then
   current_context:=jovabook_private.recovery_context(s,job.user_id,job.booking_id);
   if not cfg.enabled or not cfg.recovery_enabled or job.created_at<now()-interval '15 minutes' or current_context is null or current_context->>'fingerprint'<>job.fingerprint or exists(select 1 from jsonb_array_elements(job.recipients) x where not current_context->'candidates' @> jsonb_build_array(x)) then
    update jovabook_private.recovery_dispatches set stage='cancelled',lease=null,lease_until=null,updated_at=now() where id=job.id;return 'false';
   end if;return 'true';
  end if;
  next_stage:=p_payload->>'stage';
  if next_stage not in('sent','needs_attention','cancelled') and (not cfg.enabled or not cfg.recovery_enabled or not exists(select 1 from jovabook_private.business_integrations where salon_id=s and provider='mailchimp' and revision=job.revision)) then raise exception 'Connection changed.';end if;
  if not (next_stage in('needs_attention','cancelled') or (job.stage,next_stage) in(('preparing','creating_segment'),('creating_segment','segment_saved'),('segment_saved','creating_campaign'),('creating_campaign','campaign_saved'),('campaign_saved','sending'),('sending','sent'),('unknown','sent'))) then raise exception 'Invalid recovery transition.';end if;
  if next_stage='sending' and (not cfg.enabled or not cfg.recovery_enabled or jovabook_private.recovery_context(s,job.user_id,job.booking_id)->>'fingerprint' is distinct from job.fingerprint) then raise exception 'Recovery no longer available.';end if;
  update jovabook_private.recovery_dispatches set stage=next_stage,
   segment_id=case when next_stage='segment_saved' then (p_payload->>'segment_id')::bigint else segment_id end,
   campaign_id=case when next_stage='campaign_saved' then p_payload->>'campaign_id' else campaign_id end,
   lease_until=case when next_stage in('sent','needs_attention','cancelled') then null else lease_until end,updated_at=now() where id=job.id;
  return 'true';
 end if;
 raise exception 'Unknown integration action.';
end$$;
revoke all on function public.business_integrations_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.business_integrations_worker(text,text,jsonb) to anon;
