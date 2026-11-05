-- Team logins for Pro Team: each staff member can have their own email and password.
-- A login belongs to exactly one business and one staff member. It can see that business's
-- calendar, dashboard, bookings and customers, and nothing else. The owner manages logins.
-- Patches live definitions by wrapping them, and fails loudly if something it relies on moved.
begin;

-- 1. A new, exclusive portal identity.
alter table jovabook_private.portal_roles drop constraint portal_roles_role_check;
alter table jovabook_private.portal_roles add constraint portal_roles_role_check check(role in('business','customer','team'));

do $$declare src text;n text;begin
 src:=pg_get_functiondef('jovabook_private.claim_portal(uuid,text)'::regprocedure);
 n:=$n$if p_role not in ('business','customer') then$n$;
 if position(n in src)=0 then raise exception 'claim_portal role check changed; review before editing.';end if;
 src:=replace(src,n,$n$if p_role not in ('business','customer','team') then$n$);
 n:=$n$or (p_role='customer' and exists(select 1 from public.salons where owner_id=p_user))$n$;
 if position(n in src)=0 then raise exception 'claim_portal owner guard changed; review before editing.';end if;
 execute replace(src,n,$n$or (p_role in ('customer','team') and exists(select 1 from public.salons where owner_id=p_user))$n$);
end$$;

-- 2. One login per staff member, tied to the business.
create table jovabook_private.team_logins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 salon_id uuid not null,
 staff_id text not null,
 email text not null check(email=lower(trim(email)) and length(email) between 5 and 254),
 created_at timestamptz not null default now(),
 unique(salon_id,staff_id),
 foreign key(salon_id,staff_id) references public.staff(salon_id,id) on delete cascade);
alter table jovabook_private.team_logins enable row level security;
revoke all on jovabook_private.team_logins from public,anon,authenticated;

-- Removing a team member (or the login) also removes the account, so the email can be reused.
create function jovabook_private.team_login_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 begin delete from auth.users where id=old.user_id;exception when others then null;end;
 return old;
end$$;
create trigger team_login_account_cleanup after delete on jovabook_private.team_logins for each row execute function jovabook_private.team_login_cleanup();

-- 3. Which business this login may use. Only active members of a paid Pro Team business with open billing.
create function jovabook_private.team_login_salon(p_user uuid) returns uuid language sql stable security definer set search_path='' as $$
 select t.salon_id from jovabook_private.team_logins t
 join public.staff st on st.salon_id=t.salon_id and st.id=t.staff_id
 where t.user_id=p_user and st.active
  and jovabook_private.offer_plan(t.salon_id)='premium' and jovabook_private.billing_open(t.salon_id)
$$;
revoke all on function jovabook_private.team_login_salon(uuid) from public,anon,authenticated;
create function public.staff_salon_id() returns uuid language sql stable security definer set search_path='' as $$
 select jovabook_private.team_login_salon((select auth.uid()))
$$;
revoke all on function public.staff_salon_id() from public,anon,authenticated;
grant execute on function public.staff_salon_id() to authenticated;

-- 4. Row access for team members. A team member sees and changes only their own bookings, and the
-- customers they added or have booked. They read the services list and their own staff record.
-- Payments, email activity, the business record and billing stay owner-only. The existing
-- restrictive billing boundary still applies on top of these policies.
create function public.team_staff_id() returns text language sql stable security definer set search_path='' as $$
 select t.staff_id from jovabook_private.team_logins t
 where t.user_id=(select auth.uid()) and t.salon_id=jovabook_private.team_login_salon(t.user_id)
$$;
revoke all on function public.team_staff_id() from public,anon,authenticated;
grant execute on function public.team_staff_id() to authenticated;
alter table public.customers add column created_by uuid default auth.uid();
create function public.team_sees_customer(p_salon uuid,p_customer text,p_created_by uuid) returns boolean language sql stable security definer set search_path='' as $$
 select p_salon=jovabook_private.team_login_salon((select auth.uid())) and (
  p_created_by is not distinct from (select auth.uid())
  or exists(select 1 from public.bookings b where b.salon_id=p_salon and b.customer_id=p_customer and b.staff_id=public.team_staff_id()))
$$;
revoke all on function public.team_sees_customer(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.team_sees_customer(uuid,text,uuid) to authenticated;
create policy "team reads services" on public.services for select to authenticated using (salon_id=public.staff_salon_id());
create policy "team reads categories" on public.categories for select to authenticated using (salon_id=public.staff_salon_id());
create policy "team reads own record" on public.staff for select to authenticated using (salon_id=public.staff_salon_id() and id=public.team_staff_id());
create policy "team reads own bookings" on public.bookings for select to authenticated using (salon_id=public.staff_salon_id() and staff_id=public.team_staff_id());
create policy "team adds own bookings" on public.bookings for insert to authenticated with check (salon_id=public.staff_salon_id() and staff_id=public.team_staff_id());
create policy "team edits own bookings" on public.bookings for update to authenticated using (salon_id=public.staff_salon_id() and staff_id=public.team_staff_id()) with check (salon_id=public.staff_salon_id() and staff_id=public.team_staff_id());
create policy "team reads own customers" on public.customers for select to authenticated using (public.team_sees_customer(salon_id,id,created_by));
create policy "team adds customers" on public.customers for insert to authenticated with check (salon_id=public.staff_salon_id());
create policy "team edits own customers" on public.customers for update to authenticated using (public.team_sees_customer(salon_id,id,created_by)) with check (salon_id=public.staff_salon_id());

-- 5. What the team member's session looks like. The shape matches the owner's so the app can load it,
-- but it carries no billing detail.
create function jovabook_private.team_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t jovabook_private.team_logins;s public.salons;st public.staff;o jovabook_private.offer_accounts;sid uuid;begin
 select * into t from jovabook_private.team_logins where user_id=(select auth.uid());
 if t.user_id is null then raise exception 'This account has no team login.' using errcode='42501';end if;
 sid:=jovabook_private.team_login_salon(t.user_id);
 select * into s from public.salons where id=t.salon_id;
 select * into st from public.staff where salon_id=t.salon_id and id=t.staff_id;
 if sid is null then
  return jsonb_build_object('ok',false,'access','team_suspended','team',true,'message',case when st.active is not true then 'Your login has been switched off. Ask the business owner.' else 'This business is not on an active Pro Team plan. Ask the business owner.' end);
 end if;
 select * into o from jovabook_private.offer_accounts where salon_id=sid;
 return jsonb_build_object('ok',true,'access','active','team',true,'server_now',now(),'full_until',o.paid_until,
  'business',jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'plan','premium','status',s.status),
  'team_member',jsonb_build_object('staff_id',st.id,'name',st.name,'email',t.email),
  'lifecycle',jsonb_build_object('trialEndsAt',null,'purgeAt',null),
  'billing',jsonb_build_object('connected',false,'canCheckout',false),
  'staff_limit',0);
end$$;
revoke all on function jovabook_private.team_access() from public,anon,authenticated;

do $$declare src text;begin
 src:=pg_get_functiondef('public.owner_account_access()'::regprocedure);
 if position('owner_access_before_free_offer' in src)=0 then raise exception 'owner_account_access changed; review before editing.';end if;
 execute replace(src,'public.owner_account_access(','jovabook_private.owner_access_before_team(');
end$$;
revoke all on function jovabook_private.owner_access_before_team() from public,anon,authenticated;
create or replace function public.owner_account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 -- Every owner-only endpoint sits behind this check, so a team login can never pass it.
 if jovabook_private.portal_role()='team' then return jsonb_build_object('ok',false,'access','wrong_portal','role','team','message','This is a team login. It opens the calendar, dashboard, bookings and customers for your business.');end if;
 return jovabook_private.owner_access_before_team();
end$$;
revoke all on function public.owner_account_access() from public,anon;
grant execute on function public.owner_account_access() to authenticated;

-- The team member's own access check. It raises for anyone who is not a team login.
create function public.team_account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if jovabook_private.portal_role()<>'team' then raise exception 'This is not a team login.' using errcode='42501';end if;
 return jovabook_private.team_access();
end$$;
revoke all on function public.team_account_access() from public,anon,authenticated;
grant execute on function public.team_account_access() to authenticated;

-- The business record for a team member: only what the calendar needs. It has the same shape as the
-- owner's record, with the viewer's own id where the owner's id would be, so no owner detail is shared.
create function public.team_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sid uuid:=public.staff_salon_id();s public.salons;begin
 if sid is null then return null;end if;
 select * into s from public.salons where id=sid;
 return jsonb_build_object('id',s.id,'owner_id',(select auth.uid()),'name',s.name,'slug',s.slug,'owner_name','','email','','address',s.address,'phone',s.phone,
  'settings',s.settings,'status',s.status,'plan',s.plan,'payments','{}'::jsonb,'usage','{}'::jsonb,'created_at',s.created_at);
end$$;
revoke all on function public.team_workspace() from public,anon,authenticated;
grant execute on function public.team_workspace() to authenticated;

-- 6. What the owner sees in the Staff editor.
create function public.owner_team_logins() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sid uuid:=public.my_salon_id();begin
 if sid is null then return '[]'::jsonb;end if;
 return coalesce((select jsonb_agg(jsonb_build_object('staff_id',staff_id,'email',email,'created_at',created_at) order by created_at) from jovabook_private.team_logins where salon_id=sid),'[]'::jsonb);
end$$;
revoke all on function public.owner_team_logins() from public,anon,authenticated;
grant execute on function public.owner_team_logins() to authenticated;

-- 7. Server-only worker used by the JovaBook API after it has checked the owner. Safe to repeat.
create function public.booking_team_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jovabook_private.billing_config;sid uuid;stf text;uid uuid;mail text;st public.staff;t jovabook_private.team_logins;begin
 select * into c from jovabook_private.billing_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or c.worker_hash is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>c.worker_hash then raise exception 'Invalid billing worker credentials.' using errcode='42501';end if;
 sid:=(p_payload->>'salon')::uuid;stf:=p_payload->>'staff_id';
 if sid is null or coalesce(stf,'')='' then raise exception 'Choose a team member.' using errcode='23514';end if;
 perform pg_advisory_xact_lock(hashtextextended('jovabook-team:'||sid::text,0));
 select * into st from public.staff where salon_id=sid and id=stf;
 if st.id is null then return jsonb_build_object('ok',false,'code','no_staff','message','Save this team member before giving them a login.');end if;
 select * into t from jovabook_private.team_logins where salon_id=sid and staff_id=stf;
 if p_action='context' then
  return jsonb_build_object('ok',true,'plan',jovabook_private.offer_plan(sid),'billing_open',jovabook_private.billing_open(sid),'active',st.active,
   'has_login',t.user_id is not null,'user_id',t.user_id,'email',t.email);
 elsif p_action='link' then
  uid:=(p_payload->>'user')::uuid;mail:=lower(trim(p_payload->>'email'));
  if jovabook_private.offer_plan(sid)<>'premium' or not jovabook_private.billing_open(sid) then return jsonb_build_object('ok',false,'code','plan','message','Team logins are part of the Pro Team plan.');end if;
  if not st.active then return jsonb_build_object('ok',false,'code','inactive','message','Switch this team member on before giving them a login.');end if;
  if t.user_id is not null then return jsonb_build_object('ok',false,'code','exists','message','This team member already has a login.');end if;
  if uid is null or coalesce(mail,'')='' then raise exception 'Enter an email address.' using errcode='23514';end if;
  perform jovabook_private.claim_portal(uid,'team');
  insert into jovabook_private.team_logins(user_id,salon_id,staff_id,email) values(uid,sid,stf,mail);
  return jsonb_build_object('ok',true,'user_id',uid,'email',mail);
 elsif p_action='unlink' then
  if t.user_id is null then return jsonb_build_object('ok',true,'removed',false);end if;
  delete from jovabook_private.team_logins where user_id=t.user_id;
  return jsonb_build_object('ok',true,'removed',true,'user_id',t.user_id);
 elsif p_action='email' then
  mail:=lower(trim(p_payload->>'email'));
  if t.user_id is null then return jsonb_build_object('ok',false,'code','none','message','This team member has no login yet.');end if;
  update jovabook_private.team_logins set email=mail where user_id=t.user_id;
  return jsonb_build_object('ok',true,'user_id',t.user_id,'email',mail);
 end if;
 raise exception 'Unknown team operation.' using errcode='23514';
end$$;
revoke all on function public.booking_team_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_team_worker(text,text,jsonb) to anon,authenticated;

notify pgrst,'reload schema';
commit;
