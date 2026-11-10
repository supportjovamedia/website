begin;
-- Operator-sent nudges for accounts that stopped part-way through signup.
-- The browser never supplies a recipient: the server asks this guarded function who may be emailed.
create table jovabook_private.operator_outreach(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 template text not null check (template in ('verify_email','come_back','finish_setup')),
 sent_by uuid,
 status text not null default 'claimed' check (status in ('claimed','sent','failed')),
 provider_id text,
 created_at timestamptz not null default now(),
 finished_at timestamptz
);
create index operator_outreach_user_idx on jovabook_private.operator_outreach(user_id,created_at desc);
alter table jovabook_private.operator_outreach enable row level security;
revoke all on jovabook_private.operator_outreach from public,anon,authenticated;

create function public.operator_outreach_prepare(p_user uuid,p_template text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u record;has_business boolean;last_sent timestamptz;oid uuid;
begin
 perform jovabook_private.require_operator();
 if p_user is null or p_template is null or p_template not in ('verify_email','come_back','finish_setup') then
  return jsonb_build_object('ok',false,'message','Choose an email template.');end if;
 perform pg_advisory_xact_lock(hashtext('operator_outreach:'||p_user::text));
 select id,email,created_at,email_confirmed_at,last_sign_in_at,raw_user_meta_data into u from auth.users where id=p_user;
 if not found or u.email is null
  or exists(select 1 from jovabook_private.operators o where o.email=lower(trim(u.email)))
  or exists(select 1 from jovabook_private.team_logins t where t.user_id=u.id)
  or exists(select 1 from jovabook_private.portal_roles r where r.user_id=u.id and r.role in ('customer','operator','team')) then
  return jsonb_build_object('ok',false,'message','This account cannot be emailed from here.');end if;
 has_business:=exists(select 1 from public.salons s where s.owner_id=u.id);
 if p_template='verify_email' and u.email_confirmed_at is not null then
  return jsonb_build_object('ok',false,'message','This email is already verified.');end if;
 if p_template='finish_setup' and (u.email_confirmed_at is null or has_business) then
  return jsonb_build_object('ok',false,'message','Only verified accounts without a business can get this email.');end if;
 if p_template='come_back' and (u.email_confirmed_at is null or coalesce(u.last_sign_in_at,u.created_at)>now()-interval '3 days') then
  return jsonb_build_object('ok',false,'message','Only verified accounts that have not signed in for 3 days can get this email.');end if;
 select max(created_at) into last_sent from jovabook_private.operator_outreach
  where user_id=u.id and (status='sent' or (status='claimed' and created_at>now()-interval '10 minutes'));
 if last_sent is not null and last_sent>now()-interval '3 days' then
  return jsonb_build_object('ok',false,'message','This person was emailed in the last 3 days.');end if;
 insert into jovabook_private.operator_outreach(user_id,template,sent_by) values(u.id,p_template,auth.uid()) returning id into oid;
 return jsonb_build_object('ok',true,'id',oid,'email',u.email,'first_name',nullif(left(u.raw_user_meta_data->>'first_name',40),''));
end$$;
revoke all on function public.operator_outreach_prepare(uuid,text) from public,anon;
grant execute on function public.operator_outreach_prepare(uuid,text) to authenticated;

create function public.operator_outreach_finish(p_id uuid,p_status text,p_provider text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t text;
begin
 perform jovabook_private.require_operator();
 if p_status not in ('sent','failed') then return jsonb_build_object('ok',false);end if;
 update jovabook_private.operator_outreach set status=p_status,provider_id=left(p_provider,80),finished_at=now()
  where id=p_id and status='claimed' returning template into t;
 if t is null then return jsonb_build_object('ok',false);end if;
 insert into jovabook_private.operator_audit(actor_id,action) values(auth.uid(),'outreach_'||p_status||'_'||t);
 return jsonb_build_object('ok',true);
end$$;
revoke all on function public.operator_outreach_finish(uuid,text,text) from public,anon;
grant execute on function public.operator_outreach_finish(uuid,text,text) to authenticated;

-- Show the last email sent beside each signup, using the existing guarded Overview response.
alter function public.operator_signup_flow(integer) set schema jovabook_private;
alter function jovabook_private.operator_signup_flow(integer) rename to signup_flow_before_outreach;
revoke all on function jovabook_private.signup_flow_before_outreach(integer) from public,anon,authenticated;
create function public.operator_signup_flow(p_days integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;entries jsonb;
begin
 perform jovabook_private.require_operator();
 result:=jovabook_private.signup_flow_before_outreach(p_days);
 select coalesce(jsonb_agg(e.value||jsonb_build_object('outreach',(
  select jsonb_build_object('template',o.template,'at',o.created_at) from jovabook_private.operator_outreach o
  where o.user_id=(e.value->>'id')::uuid and o.status='sent' order by o.created_at desc limit 1)) order by e.ordinality),'[]'::jsonb) into entries
 from jsonb_array_elements(result->'recent') with ordinality e(value,ordinality);
 return result||jsonb_build_object('recent',entries);
end$$;
revoke all on function public.operator_signup_flow(integer) from public,anon;
grant execute on function public.operator_signup_flow(integer) to authenticated;
commit;
