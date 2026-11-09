begin;
alter table jovabook_private.owner_onboarding add column welcome_seen_at timestamptz;
-- Existing completed accounts are not new registrations and must not get a surprise welcome.
update jovabook_private.owner_onboarding set welcome_seen_at=completed_at where completed_at is not null;
create function public.claim_owner_welcome() returns boolean language plpgsql security definer set search_path='' as $$
declare identity uuid;claimed uuid;
begin
 identity:=jovabook_private.onboarding_identity();
 update jovabook_private.owner_onboarding set welcome_seen_at=now() where user_id=identity and completed_at is not null and welcome_seen_at is null
  and exists(select 1 from public.salons where owner_id=identity and status='active') returning user_id into claimed;
 return claimed is not null;
end$$;
revoke all on function public.claim_owner_welcome() from public,anon,authenticated;
grant execute on function public.claim_owner_welcome() to authenticated;
-- Keep the existing verified-owner checks and onboarding behaviour for all other steps.
alter function public.owner_onboarding_progress(text,jsonb) set schema jovabook_private;
alter function jovabook_private.owner_onboarding_progress(text,jsonb) rename to onboarding_before_primary_service;
revoke all on function jovabook_private.onboarding_before_primary_service(text,jsonb) from public,anon,authenticated;
create function public.owner_onboarding_progress(p_step text default 'read',p_values jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare identity uuid;result jsonb;description text;extra jsonb:='{}'::jsonb;clean jsonb;locations jsonb;
begin
 if p_step is null or p_step not in('profile','business','category','location','software') then return jovabook_private.onboarding_before_primary_service(p_step,p_values);end if;
 identity:=jovabook_private.onboarding_identity();
 perform pg_advisory_xact_lock(hashtext('jovabook-onboarding:'||identity::text));
 if p_values is null or jsonb_typeof(p_values)<>'object' or pg_column_size(p_values)>4096 then raise exception 'Invalid setup details.' using errcode='22023';end if;
 if p_step='profile' then
  if p_values?'legal_accepted' then
   if p_values->>'legal_accepted' is distinct from 'accepted' then raise exception 'Agree to the terms to continue.' using errcode='22023';end if;
   extra:=jsonb_build_object('terms_accepted_at',now(),'terms_version','2026-11-free-v1');
  end if;
  clean:=p_values-'legal_accepted';
 elsif p_step='business' then
  description:=trim(coalesce(p_values->>'existing_website',''));
  if (p_values?'existing_website' and jsonb_typeof(p_values->'existing_website') is distinct from 'string') or length(description)>2048 or (description<>'' and description!~* '^https?://[^[:space:]/]+([/?#][^[:space:]]*)?$') or description ~ '[[:cntrl:]]' then raise exception 'Enter a valid website address, or leave it blank.' using errcode='22023';end if;
  extra:=jsonb_build_object('existing_website',description);clean:=p_values-'existing_website';
 elsif p_step='location' then
  if exists(select 1 from jsonb_object_keys(p_values) k where k not in('service_location','service_locations')) then raise exception 'Invalid service location.' using errcode='22023';end if;
  locations:=coalesce(p_values->'service_locations',jsonb_build_array(p_values->>'service_location'));
  if jsonb_typeof(locations)<>'array' then raise exception 'Choose your service locations.' using errcode='22023';end if;
  if jsonb_array_length(locations) not between 1 and 3 or exists(select 1 from jsonb_array_elements(locations) v where jsonb_typeof(v)<>'string' or v#>>'{}' not in('physical','mobile','online')) then raise exception 'Choose your service locations.' using errcode='22023';end if;
  select jsonb_agg(v order by v) into locations from(select distinct v from jsonb_array_elements_text(locations) v) t;
  extra:=jsonb_build_object('service_locations',locations);clean:=jsonb_build_object('service_location',locations->>0);
 elsif p_step='software' then
  if exists(select 1 from jsonb_object_keys(p_values) k where k not in('current_software','other_software')) or jsonb_typeof(p_values->'current_software') is distinct from 'string'
   or coalesce(p_values->>'current_software','') not in('Acuity','Booksy','Faces','Fresha','Goldie','Kitomba','Mindbody','Ovatu','Pabau','Phorest','Salon Iris','Setmore','Shortcuts','SimplyBook.me','Slick','Square','Timely','Treatwell','Vagaro','Zenoti','none','other') then raise exception 'Choose your current system.' using errcode='22023';end if;
  extra:=jsonb_build_object('current_software',p_values->>'current_software');
  if p_values->>'current_software'='other' then
   description:=trim(coalesce(p_values->>'other_software',''));
   if jsonb_typeof(p_values->'other_software') is distinct from 'string' or length(description) not between 1 and 80 or description ~ '[[:cntrl:]]' then raise exception 'Enter your current system.' using errcode='22023';end if;
   extra:=extra||jsonb_build_object('other_software',description);
  end if;
  -- Entry retains the existing verified-owner and role guards without creating a business.
  result:=jovabook_private.onboarding_before_primary_service('read','{}');
  insert into jovabook_private.owner_onboarding(user_id,data,steps) values(identity,extra,jsonb_build_object('software',now())) on conflict(user_id) do update set data=(owner_onboarding.data-'other_software')||excluded.data,steps=owner_onboarding.steps||excluded.steps,updated_at=now();
  return jovabook_private.onboarding_before_primary_service('read','{}');
 end if;
 if p_step<>'category' then
  result:=jovabook_private.onboarding_before_primary_service(p_step,clean);
  update jovabook_private.owner_onboarding set data=data||extra where user_id=identity;
  return result||jsonb_build_object('data',(result->'data')||extra);
 end if;
 if p_values is null or jsonb_typeof(p_values)<>'object' or pg_column_size(p_values)>4096
  or exists(select 1 from jsonb_object_keys(p_values) k where k not in ('primary_category','other_category','related_categories'))
  or jsonb_typeof(p_values->'primary_category') is distinct from 'string'
  or (p_values?'other_category' and jsonb_typeof(p_values->'other_category') is distinct from 'string')
  then raise exception 'Choose your primary service.' using errcode='22023';end if;
 if p_values->>'primary_category'='other' then
  description:=trim(coalesce(p_values->>'other_category',''));
  if char_length(description) not between 1 and 80 or description ~ '[[:cntrl:]]' then raise exception 'Tell us your primary service in 80 characters or fewer.' using errcode='22023';end if;
  extra:=jsonb_build_object('other_category',description);
 end if;
 -- Legacy cached clients may still send related choices; validate them but no longer retain them.
 result:=jovabook_private.onboarding_before_primary_service('category',jsonb_build_object('primary_category',p_values->>'primary_category','related_categories',coalesce(p_values->'related_categories','[]'::jsonb)));
 update jovabook_private.owner_onboarding set data=(data-'related_categories'-'other_category')||extra where user_id=identity;
 return result||jsonb_build_object('data',((result->'data')-'related_categories'-'other_category')||extra);
end$$;
revoke all on function public.owner_onboarding_progress(text,jsonb) from public,anon,authenticated;
grant execute on function public.owner_onboarding_progress(text,jsonb) to authenticated;

-- Registration send reservations are shared across browsers, never a browser-only counter.
-- Native Auth remains the mail sender and keeps its own rate limits. This limits the
-- product flow, not callers who bypass it and call public Auth endpoints directly.
create table jovabook_private.owner_code_budget(email_key text primary key,requested_at timestamptz[] not null);
create table jovabook_private.owner_code_salt(id boolean primary key default true check(id),salt uuid not null default gen_random_uuid());
insert into jovabook_private.owner_code_salt(id) values(true);
alter table jovabook_private.owner_code_budget enable row level security;
alter table jovabook_private.owner_code_salt enable row level security;
revoke all on table jovabook_private.owner_code_budget,jovabook_private.owner_code_salt from public,anon,authenticated;
create function public.reserve_owner_verification(p_email text) returns jsonb language plpgsql security definer set search_path='' as $$
declare address text:=lower(trim(p_email));key text;times timestamptz[];last_sent timestamptz;wait integer;
begin
 if address is null or length(address)>254 or address!~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return jsonb_build_object('ok',false,'retry_after',0);end if;
 select md5(address||salt::text) into key from jovabook_private.owner_code_salt where id;
 perform pg_advisory_xact_lock(hashtext('jovabook-code:'||key));
 select array_agg(t order by t) into times from jovabook_private.owner_code_budget b cross join lateral unnest(b.requested_at) t where b.email_key=key and t>now()-interval '24 hours';
 times:=coalesce(times,'{}'::timestamptz[]);last_sent:=times[array_length(times,1)];
 if cardinality(times)>=3 then return jsonb_build_object('ok',false,'limited',true,'remaining',0,'retry_after',greatest(1,ceil(extract(epoch from times[1]+interval '24 hours'-now()))::integer));end if;
 if last_sent>now()-interval '60 seconds' then return jsonb_build_object('ok',false,'remaining',3-cardinality(times),'retry_after',greatest(1,ceil(extract(epoch from last_sent+interval '60 seconds'-now()))::integer));end if;
 delete from jovabook_private.owner_code_budget where requested_at[array_length(requested_at,1)]<now()-interval '24 hours';
 insert into jovabook_private.owner_code_budget values(key,array_append(times,now())) on conflict(email_key) do update set requested_at=excluded.requested_at;
 return jsonb_build_object('ok',true,'remaining',2-cardinality(times),'retry_after',60);
end$$;
revoke all on function public.reserve_owner_verification(text) from public,anon,authenticated;
grant execute on function public.reserve_owner_verification(text) to anon,authenticated;

-- A bounded, atomic CSV import into this verified owner's business only. No overwrites
-- and no marketing permission, messages, invitations or bookings are created by import.
create function public.owner_import_clients(p_rows jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare identity uuid;business uuid;r jsonb;n text;e text;p text;added integer:=0;changed integer;
begin
 identity:=jovabook_private.onboarding_identity();
 select id into business from public.salons where owner_id=identity and status in('setup','active');
 if business is null then raise exception 'Create your business first.' using errcode='42501';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Choose a valid client CSV.' using errcode='22023';end if;
 if jsonb_array_length(p_rows) not between 1 and 500 or pg_column_size(p_rows)>250000 then raise exception 'Import up to 500 clients at a time.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-import:'||business::text));
 for r in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(r)<>'object' then raise exception 'Check your client details.' using errcode='22023';end if;
  if exists(select 1 from jsonb_object_keys(r) k where k not in('name','email','phone')) or exists(select 1 from jsonb_each(r) v where jsonb_typeof(v.value)<>'string') then raise exception 'Only name, email and phone are accepted.' using errcode='22023';end if;
  n:=trim(coalesce(r->>'name',''));e:=lower(trim(coalesce(r->>'email','')));p:=trim(coalesce(r->>'phone',''));
  if length(n) not between 1 and 80 or length(e)>254 or length(p)>40 or (e='' and p='') or (e<>'' and e!~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (p<>'' and p!~ '^\+?[0-9 ()-]{7,40}$') or (n||e||p)~'[[:cntrl:]]' then raise exception 'Check your client details.' using errcode='22023';end if;
  insert into public.customers(salon_id,id,name,email,phone) select business,'csv-'||md5(n||'|'||e||'|'||p),n,e,p
   where not exists(select 1 from public.customers c where c.salon_id=business and ((e<>'' and lower(c.email)=e) or (p<>'' and regexp_replace(c.phone,'[^0-9]','','g')=regexp_replace(p,'[^0-9]','','g')))) on conflict(salon_id,id) do nothing;
  get diagnostics changed=row_count;added:=added+changed;
 end loop;
 return jsonb_build_object('ok',true,'imported',added,'skipped',jsonb_array_length(p_rows)-added);
end$$;
revoke all on function public.owner_import_clients(jsonb) from public,anon,authenticated;
grant execute on function public.owner_import_clients(jsonb) to authenticated;
alter table jovabook_private.owner_flow_events drop constraint owner_flow_events_stage_check;
alter table jovabook_private.owner_flow_events add constraint owner_flow_events_stage_check check(setup_stage is null or setup_stage in ('email','check-email','profile','business','category','team','location','software','source','ready'));
create or replace function public.report_owner_activity(p_id uuid,p_session uuid,p_step text,p_code text,p_status integer,p_stage text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare identity uuid:=auth.uid();
begin
 if p_id is null or p_session is null or p_step is null or p_code is null or p_status is null
  or p_step not in ('signup','login','verification','business_setup','account_access','setup','runtime','dashboard','calendar','bookings','customers','services','staff','insights','personalise','website','billing','settings','availability')
  or p_code not in ('page_opened','network_unavailable','request_rejected','server_error','rate_limited','email_not_confirmed','verification_failed','region_unavailable','setup_resumed','runtime_error','session_identified','step_viewed','step_saved','verification_requested')
  or p_status<0 or p_status>599
  or (p_stage is not null and p_stage not in ('email','check-email','profile','business','category','team','location','software','source','ready'))
  or (identity is null and (p_code='session_identified' or p_step not in ('signup','login','verification','business_setup','account_access','setup','runtime')))
  then return jsonb_build_object('ok',false);end if;
 if not pg_try_advisory_xact_lock(6091127) then return jsonb_build_object('ok',true,'stored',false);end if;
 delete from jovabook_private.owner_flow_events where created_at<now()-interval '30 days';
 if exists(select 1 from jovabook_private.owner_flow_events where id=p_id) then return jsonb_build_object('ok',true,'stored',false);end if;
 if (select count(*) from jovabook_private.owner_flow_events where created_at>=now()-interval '1 day')>=2000
  or (select count(*) from jovabook_private.owner_flow_events where created_at>=now()-interval '1 minute')>=40
  or (select count(*) from jovabook_private.owner_flow_events where browser_session=p_session and created_at>=now()-interval '15 minutes')>=20
  or (identity is not null and (select count(*) from jovabook_private.owner_flow_events where user_id=identity and created_at>=now()-interval '15 minutes')>=20)
  then return jsonb_build_object('ok',true,'stored',false);end if;
 insert into jovabook_private.owner_flow_events(id,user_id,step,code,http_status,browser_session,setup_stage)
 values(p_id,identity,p_step,p_code,p_status,p_session,p_stage);
 return jsonb_build_object('ok',true,'stored',true);
end$$;
revoke all on function public.report_owner_activity(uuid,uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.report_owner_activity(uuid,uuid,text,text,integer,text) to anon,authenticated;


commit;
