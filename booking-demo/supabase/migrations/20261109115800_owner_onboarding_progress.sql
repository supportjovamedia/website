begin;
create table jovabook_private.owner_onboarding(
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb,
 steps jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz
);
alter table jovabook_private.owner_onboarding enable row level security;
revoke all on table jovabook_private.owner_onboarding from public,anon,authenticated;
create function jovabook_private.onboarding_identity() returns uuid
language plpgsql security definer set search_path='' as $$
declare identity uuid;
begin
 select id into identity from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if identity is null or exists(select 1 from jovabook_private.portal_roles where user_id=identity and role in('customer','operator','team'))
  or exists(select 1 from jovabook_private.team_logins where user_id=identity)
  or exists(select 1 from jovabook_private.operators o join auth.users u on lower(u.email)=o.email where u.id=identity)
 then raise exception 'Sign in with a verified business account.' using errcode='42501';end if;
 return identity;
end$$;
revoke all on function jovabook_private.onboarding_identity() from public,anon,authenticated;
create function public.owner_onboarding_progress(p_step text default 'read',p_values jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare identity uuid;progress jovabook_private.owner_onboarding;metadata jsonb;values_to_save jsonb;business uuid;allowed text[];
 categories text[]:=array['hair','barber','nails','lashes','beauty','aesthetics','massage','spa','waxing','tattoo','tanning','fitness','physio','health','pets','tutoring','photography','driving','professional','other'];
begin
 identity:=jovabook_private.onboarding_identity();
 if p_step is null or p_step not in('read','entry','profile','business','category','team','location','source','complete') or p_values is null or jsonb_typeof(p_values)<>'object' or pg_column_size(p_values)>4096 then raise exception 'Invalid setup step.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-onboarding:'||identity::text));
 select raw_user_meta_data into metadata from auth.users where id=identity;
 select id into business from public.salons where owner_id=identity;
 if p_step<>'read' then
  allowed:=case p_step when 'profile' then array['first_name','last_name','mobile','country'] when 'business' then array['business_name','booking_slug','referral_code'] when 'category' then array['primary_category','related_categories'] when 'team' then array['team_size'] when 'location' then array['service_location'] when 'source' then array['heard_about'] else array[]::text[] end;
  if exists(select 1 from jsonb_object_keys(p_values) k where not(k=any(allowed))) then raise exception 'Unsupported setup field.' using errcode='22023';end if;
  if exists(select 1 from jsonb_each(p_values) e where e.key<>'related_categories' and jsonb_typeof(e.value)<>'string') then raise exception 'Setup fields must contain text.' using errcode='22023';end if;
  values_to_save:=p_values;
  if p_step='profile' then
   if length(trim(coalesce(p_values->>'first_name','')))=0 or length(trim(coalesce(p_values->>'last_name','')))=0 or length(p_values->>'first_name')>40 or length(p_values->>'last_name')>40 or coalesce(p_values->>'country','') not in('GB','US','CA','AU') or (coalesce(p_values->>'mobile','')<>'' and ((p_values->>'mobile') !~ '^\+?[0-9 ()-]{7,24}$' or length(regexp_replace(p_values->>'mobile','[^0-9]','','g')) not between 7 and 15)) then raise exception 'Check your name, country and optional mobile.' using errcode='22023';end if;
   values_to_save:=jsonb_build_object('first_name',trim(p_values->>'first_name'),'last_name',trim(p_values->>'last_name'),'country',p_values->>'country','mobile',trim(coalesce(p_values->>'mobile','')));
  elsif p_step='business' then
   if length(trim(coalesce(p_values->>'business_name','')))=0 or length(p_values->>'business_name')>60 or length(coalesce(p_values->>'booking_slug','')) not between 3 and 30 or (p_values->>'booking_slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or (coalesce(p_values->>'referral_code','')<>'' and (p_values->>'referral_code') !~ '^[A-Z0-9]{10}$') then raise exception 'Check your business name and booking address.' using errcode='22023';end if;
  elsif p_step='category' then
   if not(coalesce(p_values->>'primary_category','')=any(categories)) or jsonb_typeof(p_values->'related_categories') is distinct from 'array' then raise exception 'Choose a business category.' using errcode='22023';end if;
   if jsonb_array_length(p_values->'related_categories')>3 or exists(select 1 from jsonb_array_elements_text(p_values->'related_categories') c where not(c=any(categories)) or c=p_values->>'primary_category') then raise exception 'Choose up to three related categories.' using errcode='22023';end if;
  elsif p_step='team' then
   if coalesce(p_values->>'team_size','') not in('independent','2-5','6-10','11-20','20+') then raise exception 'Choose your team size.' using errcode='22023';end if;
  elsif p_step='location' then
   if coalesce(p_values->>'service_location','') not in('physical','mobile','online') then raise exception 'Choose where you provide services.' using errcode='22023';end if;
  elsif p_step='source' then
   if coalesce(p_values->>'heard_about','') not in('friend','search','instagram','facebook','nextdoor','social_other','ai','directory','other') then raise exception 'Choose how you heard about JovaBook.' using errcode='22023';end if;
  end if;
  insert into jovabook_private.owner_onboarding(user_id,data,steps) values(identity,values_to_save,jsonb_build_object(p_step,now()))
   on conflict(user_id) do update set data=owner_onboarding.data||excluded.data,steps=owner_onboarding.steps||excluded.steps,updated_at=now();
  if p_step='entry' then update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('signup_intent','business','owner_name',left(coalesce(raw_user_meta_data->>'owner_name',raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),80)) where id=identity;end if;
  if p_step='profile' then update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||values_to_save||jsonb_build_object('owner_name',(values_to_save->>'first_name')||' '||(values_to_save->>'last_name'),'signup_intent','business') where id=identity;end if;
 end if;
 select * into progress from jovabook_private.owner_onboarding where user_id=identity;
 if p_step='complete' then
  if business is null or not(progress.steps ?& array['profile','business','category','team','location','source']) then raise exception 'Finish your business details first.' using errcode='22023';end if;
  -- Dashboard access is free. Unsupplied availability stays closed.
  update public.salons set status='active',settings=coalesce(settings,'{}'::jsonb)||
   case when not(coalesce(settings,'{}'::jsonb)?'hours') then '{"hours":{"start":"09:00","end":"18:00","days":[]}}'::jsonb else '{}'::jsonb end||
   case when not(coalesce(settings,'{}'::jsonb)?'country') then jsonb_build_object('country',progress.data->>'country','currency',case progress.data->>'country' when 'US' then 'USD' when 'CA' then 'CAD' when 'AU' then 'AUD' else 'GBP' end,'timezone',case progress.data->>'country' when 'US' then 'America/New_York' when 'CA' then 'America/Toronto' when 'AU' then 'Australia/Sydney' else 'Europe/London' end) else '{}'::jsonb end
   where id=business and owner_id=identity and status='setup';
  update jovabook_private.owner_onboarding set completed_at=coalesce(completed_at,now()),updated_at=now() where user_id=identity returning * into progress;
 end if;
 return jsonb_build_object('ok',true,'email',(select email from auth.users where id=identity),'business_id',business,
 'data',coalesce((select jsonb_build_object('business_name',name,'booking_slug',slug) from public.salons where id=business),'{}'::jsonb)||jsonb_strip_nulls(jsonb_build_object('first_name',left(coalesce(metadata->>'first_name',metadata->>'given_name',nullif(split_part(metadata->>'full_name',' ',1),'')),40),'last_name',left(coalesce(metadata->>'last_name',metadata->>'family_name',case when position(' ' in metadata->>'full_name')>0 then substring(metadata->>'full_name' from position(' ' in metadata->>'full_name')+1) end),40),'country',metadata->>'country','mobile',left(metadata->>'mobile',24),'business_name',left(metadata->>'business_name',60),'booking_slug',left(metadata->>'booking_slug',30)))||coalesce(progress.data,'{}'::jsonb),
 'steps',coalesce(progress.steps,'{}'::jsonb),'updated_at',progress.updated_at,'completed_at',progress.completed_at);
end$$;
revoke all on function public.owner_onboarding_progress(text,jsonb) from public,anon,authenticated;
grant execute on function public.owner_onboarding_progress(text,jsonb) to authenticated;
-- The existing access object remains authoritative. This marker changes the UI route only.
alter function public.owner_account_access() set schema jovabook_private;
alter function jovabook_private.owner_account_access() rename to owner_access_before_onboarding;
revoke all on function jovabook_private.owner_access_before_onboarding() from public,anon,authenticated;
create function public.owner_account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=jovabook_private.owner_access_before_onboarding();
 return result||jsonb_build_object('onboarding_completed',exists(select 1 from jovabook_private.owner_onboarding where user_id=auth.uid() and completed_at is not null));
end$$;
revoke all on function public.owner_account_access() from public,anon;
grant execute on function public.owner_account_access() to authenticated;
-- Enrich the existing guarded Overview response, without another browser request.
alter function public.operator_signup_flow(integer) set schema jovabook_private;
alter function jovabook_private.operator_signup_flow(integer) rename to signup_flow_before_onboarding;
revoke all on function jovabook_private.signup_flow_before_onboarding(integer) from public,anon,authenticated;
create function public.operator_signup_flow(p_days integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;entries jsonb;
begin
 perform jovabook_private.require_operator();
 result:=jovabook_private.signup_flow_before_onboarding(p_days);
 select coalesce(jsonb_agg(e.value||jsonb_build_object('onboarding',jsonb_build_object(
  'profile',jsonb_strip_nulls(jsonb_build_object('first_name',left(u.raw_user_meta_data->>'first_name',40),'last_name',left(u.raw_user_meta_data->>'last_name',40),'mobile',left(u.raw_user_meta_data->>'mobile',24),'country',u.raw_user_meta_data->>'country')),
  'details',o.data,'steps',o.steps,'completed_at',o.completed_at,'updated_at',o.updated_at)) order by e.ordinality),'[]'::jsonb) into entries
 from jsonb_array_elements(result->'recent') with ordinality e(value,ordinality)
 join auth.users u on u.id=(e.value->>'id')::uuid
 left join jovabook_private.owner_onboarding o on o.user_id=u.id;
 return result||jsonb_build_object('recent',entries);
end$$;
revoke all on function public.operator_signup_flow(integer) from public,anon;
grant execute on function public.operator_signup_flow(integer) to authenticated;
commit;
