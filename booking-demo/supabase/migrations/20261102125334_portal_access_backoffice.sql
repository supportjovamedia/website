-- Server-enforced, exclusive portal identities. Editable user metadata never grants access.
begin;
create table jovabook_private.portal_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('business','customer')), created_at timestamptz not null default now()
);
create table jovabook_private.operators(email text primary key check(email=lower(trim(email))));
insert into jovabook_private.operators values ('support.jovamedia@gmail.com');
create table jovabook_private.support_notes (
 id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade,
 actor_id uuid not null, body text not null check(length(trim(body)) between 1 and 2000),
 request_id uuid not null, created_at timestamptz not null default now(),unique(actor_id,request_id)
);
create table jovabook_private.operator_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 salon_id uuid, action text not null, created_at timestamptz not null default now()
);
create index support_notes_salon_time on jovabook_private.support_notes(salon_id,created_at desc);
create index operator_audit_salon_time on jovabook_private.operator_audit(salon_id,created_at desc);
do $$declare t text;begin foreach t in array array['portal_roles','operators','support_notes','operator_audit'] loop
 execute format('alter table jovabook_private.%I enable row level security',t);
 execute format('revoke all on jovabook_private.%I from public,anon,authenticated',t);
end loop;end$$;
create function jovabook_private.is_operator() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join jovabook_private.operators o on o.email=lower(trim(u.email))
 where u.id=(select auth.uid()) and u.email_confirmed_at is not null)
$$;
create function jovabook_private.portal_role() returns text language sql stable security definer set search_path='' as $$
 select case when u.email_confirmed_at is null then 'unverified'
 when exists(select 1 from jovabook_private.operators o where o.email=lower(trim(u.email))) then 'operator'
 when exists(select 1 from public.salons s where s.owner_id=u.id) then 'business'
 else coalesce((select r.role from jovabook_private.portal_roles r where r.user_id=u.id),'unassigned') end
 from auth.users u where u.id=(select auth.uid())
$$;
insert into jovabook_private.portal_roles(user_id,role) select owner_id,'business' from public.salons on conflict do nothing;
insert into jovabook_private.portal_roles(user_id,role) select distinct user_id,'customer' from public.customer_portal_memberships on conflict do nothing;
create function jovabook_private.claim_portal(p_user uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare existing text;begin
 if p_role not in ('business','customer') then raise exception 'Invalid portal.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('jovabook-portal:'||p_user::text,0));
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'Verify your email before continuing.' using errcode='42501';end if;
 if exists(select 1 from auth.users u join jovabook_private.operators o on o.email=lower(trim(u.email)) where u.id=p_user) then raise exception 'Use the JovaMedia back office for this account.' using errcode='42501';end if;
 select role into existing from jovabook_private.portal_roles where user_id=p_user;
 if (existing is not null and existing<>p_role) or (p_role='customer' and exists(select 1 from public.salons where owner_id=p_user)) then
 raise exception 'This account belongs to a different portal.' using errcode='42501';end if;
 insert into jovabook_private.portal_roles(user_id,role) values(p_user,p_role) on conflict do nothing;
end$$;
create function jovabook_private.enforce_portal() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_TABLE_NAME='salons' then perform jovabook_private.claim_portal(new.owner_id,'business');
 else perform jovabook_private.claim_portal(new.user_id,'customer');end if;return new;
end$$;
create trigger salon_portal_identity before insert or update of owner_id on public.salons for each row execute function jovabook_private.enforce_portal();
create trigger customer_portal_identity before insert or update of user_id on public.customer_portal_memberships for each row execute function jovabook_private.enforce_portal();
create function public.portal_identity(p_claim text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r text;begin
 r:=jovabook_private.portal_role();
 if r is null or r='unverified' then raise exception 'Verify your email and log in again.' using errcode='42501';end if;
 if p_claim is not null and p_claim<>'customer' then raise exception 'Invalid portal.' using errcode='42501';end if;
 if p_claim='customer' and r='unassigned' then perform jovabook_private.claim_portal(auth.uid(),'customer');r:='customer';end if;
 return jsonb_build_object('ok',true,'role',r);
end$$;
create or replace function jovabook_private.customer_email() returns text language sql stable security definer set search_path='' as $$
 select lower(trim(email)) from auth.users where id=(select auth.uid()) and email_confirmed_at is not null
 and jovabook_private.portal_role() in ('customer','unassigned')
$$;
create function public.customer_portal_profile(p_slug text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.customer_portal_memberships;begin
 if jovabook_private.customer_email() is null then raise exception 'Use your customer account to continue.' using errcode='42501';end if;
 select m.* into p from public.customer_portal_memberships m join public.salons s on s.id=m.salon_id where s.slug=p_slug and m.user_id=(select auth.uid());
 return jsonb_build_object('ok',true,'member',p.user_id is not null);
end$$;
-- Preserve the current annual-billing implementation behind the access boundary.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.owner_account_access()'::regprocedure);
 execute replace(definition,'public.owner_account_access(','jovabook_private.owner_access_before_portals(');
end$$;
create or replace function public.owner_account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r text;begin
 r:=jovabook_private.portal_role();
 if r in ('customer','operator') then return jsonb_build_object('ok',false,'access','wrong_portal','role',r,'message',case when r='customer' then 'This is a customer account. Use the customer login shared by your business.' else 'Use the private JovaMedia back office for this account.' end);end if;
 if r is null or r='unverified' then raise exception 'Verify your email and log in again.' using errcode='42501';end if;
 return jovabook_private.owner_access_before_portals();
end$$;
create function jovabook_private.require_operator() returns void language plpgsql stable security definer set search_path='' as $$
begin if not jovabook_private.is_operator() then raise exception 'Back-office access denied.' using errcode='42501';end if;end$$;
create function public.operator_businesses(p_search text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 perform jovabook_private.require_operator();
 select coalesce(jsonb_agg(item order by created desc),'[]') into result from (
 select s.created_at created,jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'owner',s.owner_name,'email',s.email,
 'status',s.status,'plan',case when a.ever_paid then a.paid_plan else 'essential' end,'access',jovabook_private.billing_access(s.id),
 'trial_end',a.trial_ends_at,'paid_until',a.paid_until,'cadence',a.paid_cadence,'cancel_at_period_end',a.cancel_at_period_end) item
 from public.salons s left join jovabook_private.billing_accounts a on a.salon_id=s.id
 where length(coalesce(p_search,''))<=100 and (coalesce(p_search,'')='' or position(lower(p_search) in lower(s.name||' '||s.slug||' '||s.email))>0)
 order by s.created_at desc limit 200) entries;
 insert into jovabook_private.operator_audit(actor_id,action) values(auth.uid(),'business_directory');
 return jsonb_build_object('ok',true,'businesses',result,'total',(select count(*) from public.salons));
end$$;
create function public.operator_business(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.salons;a jovabook_private.billing_accounts;begin
 perform jovabook_private.require_operator();select * into s from public.salons where id=p_id;
 if s.id is null then raise exception 'Business not found.' using errcode='P0002';end if;
 select * into a from jovabook_private.billing_accounts where salon_id=s.id;
 insert into jovabook_private.operator_audit(actor_id,salon_id,action) values(auth.uid(),s.id,'business_view');
 return jsonb_build_object('ok',true,'business',jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'owner',s.owner_name,'email',s.email,'phone',s.phone,'status',s.status,
 'plan',case when a.ever_paid then a.paid_plan else 'essential' end,'access',jovabook_private.billing_access(s.id),'trial_end',a.trial_ends_at,'paid_until',a.paid_until,'cadence',a.paid_cadence,'cancel_at_period_end',a.cancel_at_period_end,
 'staff',(select count(*) from public.staff where salon_id=s.id),'services',(select count(*) from public.services where salon_id=s.id),'bookings',(select count(*) from public.bookings where salon_id=s.id)),
 'notes',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'body',n.body,'created_at',n.created_at) order by n.created_at desc) from (select * from jovabook_private.support_notes where salon_id=s.id order by created_at desc limit 50)n),'[]'),
 'activity',coalesce((select jsonb_agg(jsonb_build_object('action',e.action,'created_at',e.created_at) order by e.created_at desc) from (select * from jovabook_private.operator_audit where salon_id=s.id order by created_at desc limit 30)e),'[]'));
end$$;
create function public.operator_add_note(p_salon uuid,p_body text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare note jovabook_private.support_notes;begin
 perform jovabook_private.require_operator();
 if p_request is null or length(trim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'Enter a note up to 2,000 characters.';end if;
 perform pg_advisory_xact_lock(hashtextextended('operator-note:'||auth.uid()::text||p_request::text,0));
 select * into note from jovabook_private.support_notes where actor_id=auth.uid() and request_id=p_request;
 if note.id is not null then if note.salon_id<>p_salon or note.body<>trim(p_body) then raise exception 'This request was already used.';end if;return jsonb_build_object('ok',true,'id',note.id);end if;
 insert into jovabook_private.support_notes(salon_id,actor_id,body,request_id) values(p_salon,auth.uid(),trim(p_body),p_request) returning * into note;
 insert into jovabook_private.operator_audit(actor_id,salon_id,action) values(auth.uid(),p_salon,'support_note_added');
 return jsonb_build_object('ok',true,'id',note.id);
end$$;
revoke all on function jovabook_private.is_operator(),jovabook_private.portal_role(),jovabook_private.claim_portal(uuid,text),jovabook_private.enforce_portal(),jovabook_private.require_operator(),jovabook_private.owner_access_before_portals() from public,anon,authenticated;
revoke all on function public.portal_identity(text),public.customer_portal_profile(text),public.operator_businesses(text),public.operator_business(uuid),public.operator_add_note(uuid,text,uuid),public.owner_account_access() from public,anon,authenticated;
grant execute on function public.portal_identity(text),public.customer_portal_profile(text),public.operator_businesses(text),public.operator_business(uuid),public.operator_add_note(uuid,text,uuid),public.owner_account_access() to authenticated;
-- Customer profiles are available through the role-checked RPC only.
revoke select on public.customer_portal_memberships from authenticated;
commit;
