-- An authorization code is exchanged at most once. Provider credentials are
-- staged encrypted until the original authenticated owner completes the flow.
create table jovabook_private.integration_oauth_flows (
 state_hash text primary key check(state_hash ~ '^[a-f0-9]{64}$'),
 verifier_hash text not null check(verifier_hash ~ '^[a-f0-9]{64}$'),
 salon_id uuid not null references public.salons(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(provider in('stripe','mailchimp')),
 expected_revision uuid,
 stage text not null default 'pending' check(stage in('pending','claimed','authorized','complete')),
 encrypted jsonb,summary jsonb,
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '10 minutes'
);
alter table jovabook_private.integration_oauth_flows enable row level security;
revoke all on jovabook_private.integration_oauth_flows from public,anon,authenticated;
create index integration_oauth_owner_created on jovabook_private.integration_oauth_flows(user_id,created_at);

create function public.business_integration_oauth_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare cfg jovabook_private.integration_config; flow jovabook_private.integration_oauth_flows;
 s uuid;u uuid;v_provider text;conn jovabook_private.business_integrations;
begin
 select * into cfg from jovabook_private.integration_config where singleton;
 if cfg.worker_hash is null or p_token is null or length(p_token)<>64 or cfg.worker_hash<>encode(sha256(convert_to(p_token,'UTF8')),'hex') then raise exception 'Invalid integration worker.' using errcode='42501';end if;
 if not cfg.enabled then raise exception 'Integrations unavailable.' using errcode='42501';end if;
 v_provider:=p_payload->>'provider';
 if v_provider not in('stripe','mailchimp') or coalesce(p_payload->>'state_hash','') !~ '^[a-f0-9]{64}$' or coalesce(p_payload->>'verifier_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid authorization state.';end if;
 if p_action='start' then
  s:=(p_payload->>'salon_id')::uuid;u:=(p_payload->>'user_id')::uuid;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||s::text));
  if not jovabook_private.integration_owner(s,u,true) or not jovabook_private.integration_connect_allowed(s,v_provider) then raise exception 'Business access denied.' using errcode='42501';end if;
  select * into conn from jovabook_private.business_integrations where salon_id=s and provider=v_provider;
  if conn.revision is distinct from (p_payload->>'expected_revision')::uuid then raise exception 'Connection changed.';end if;
  delete from jovabook_private.integration_oauth_flows where expires_at<now();
  if (select count(*) from jovabook_private.integration_oauth_flows where user_id=u and created_at>now()-interval '10 minutes')>=5 then raise exception 'Too many connection attempts. Try again shortly.';end if;
  insert into jovabook_private.integration_oauth_flows(state_hash,verifier_hash,salon_id,user_id,provider,expected_revision)
   values(p_payload->>'state_hash',p_payload->>'verifier_hash',s,u,v_provider,(p_payload->>'expected_revision')::uuid);
  return jsonb_build_object('ok',true);
 end if;
 select * into flow from jovabook_private.integration_oauth_flows where state_hash=p_payload->>'state_hash' and verifier_hash=p_payload->>'verifier_hash' and provider=v_provider and expires_at>now();
 if flow.state_hash is null then raise exception 'Authorization expired.';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||flow.salon_id::text));
 select * into flow from jovabook_private.integration_oauth_flows where state_hash=p_payload->>'state_hash' and verifier_hash=p_payload->>'verifier_hash' and provider=v_provider and expires_at>now() for update;
 if flow.state_hash is null then raise exception 'Authorization expired.';end if;
 if not jovabook_private.integration_owner(flow.salon_id,flow.user_id,true) or not jovabook_private.integration_connect_allowed(flow.salon_id,v_provider) then raise exception 'Business access changed.' using errcode='42501';end if;
 select * into conn from jovabook_private.business_integrations where salon_id=flow.salon_id and provider=v_provider;
 if conn.revision is distinct from flow.expected_revision then raise exception 'Connection changed.';end if;
 if p_action='claim' and flow.stage='pending' then
  update jovabook_private.integration_oauth_flows set stage='claimed' where state_hash=flow.state_hash;
  return jsonb_build_object('salon_id',flow.salon_id,'user_id',flow.user_id);
 elsif p_action='stage' and flow.stage='claimed' then
  if jsonb_typeof(p_payload->'encrypted') is distinct from 'object' or p_payload->'encrypted'->>'v' is distinct from '1' or octet_length((p_payload->'encrypted')::text)>32768 or jsonb_typeof(p_payload->'summary') is distinct from 'object' then raise exception 'Invalid encrypted connection.';end if;
  update jovabook_private.integration_oauth_flows set stage='authorized',encrypted=p_payload->'encrypted',summary=p_payload->'summary' where state_hash=flow.state_hash;
  return jsonb_build_object('ok',true);
 elsif p_action='complete' and flow.stage='authorized' then
  if flow.salon_id is distinct from (p_payload->>'salon_id')::uuid or flow.user_id is distinct from (p_payload->>'user_id')::uuid then raise exception 'Authorization belongs to another owner.' using errcode='42501';end if;
  insert into jovabook_private.business_integrations(salon_id,provider,encrypted,summary) values(flow.salon_id,v_provider,flow.encrypted,flow.summary)
   on conflict(salon_id,provider) do update set encrypted=excluded.encrypted,summary=excluded.summary,revision=gen_random_uuid(),verified_at=now() returning * into conn;
  update jovabook_private.integration_oauth_flows set stage='complete',encrypted=null,summary=null where state_hash=flow.state_hash;
  return jsonb_build_object('revision',conn.revision);
 end if;
 raise exception 'Authorization already used or incomplete.';
end$$;
revoke all on function public.business_integration_oauth_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.business_integration_oauth_worker(text,text,jsonb) to anon;
