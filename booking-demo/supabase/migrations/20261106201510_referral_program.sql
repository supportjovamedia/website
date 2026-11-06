begin;
-- Private ledgers retain attribution and redemptions through business deletion.
create table jovabook_private.referral_codes(
 salon_id uuid primary key references public.salons(id) on delete cascade,
 code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)) check(code ~ '^[A-Z0-9]{10}$')
);
create table jovabook_private.referrals(
 id uuid primary key default gen_random_uuid(),
 referrer uuid references public.salons(id) on delete set null,
 referred uuid unique references public.salons(id) on delete set null,
 referred_fingerprint text not null unique,
 business_name text not null,referral_code text not null,
 status text not null default 'joined' check(status in('joined','qualified','rejected')),
 joined_at timestamptz not null default now(),invoice_id text unique,subscription_id text,
 amount_paid bigint,plan text check(plan in('standard','premium')),
 period_start timestamptz,period_end timestamptz,proof_verified_at timestamptz,
 qualified_at timestamptz,reviewed_by uuid,review_note text,
 check(referrer is null or referred is null or referrer<>referred),
 check(period_end is null or period_end>period_start)
);
create index referral_referrer on jovabook_private.referrals(referrer,joined_at);
create table jovabook_private.referral_rewards(
 id uuid primary key default gen_random_uuid(),salon_id uuid references public.salons(id) on delete set null,
 source text not null unique,kind text not null check(kind in('welcome','referrer')),
 status text not null default 'available' check(status in('available','scheduled','redeemed','active','void')),
 created_at timestamptz not null default now(),invoice_id text unique,base_amount bigint,
 starts_at timestamptz,ends_at timestamptz,reviewed_by uuid,review_note text,
 check(ends_at is null or ends_at>starts_at)
);
create index referral_rewards_business on jovabook_private.referral_rewards(salon_id,status);
do $$declare t text;begin foreach t in array array['referral_codes','referrals','referral_rewards'] loop
 execute format('alter table jovabook_private.%I enable row level security',t);
 execute format('revoke all on jovabook_private.%I from public,anon,authenticated',t);
end loop;end$$;
insert into jovabook_private.referral_codes(salon_id) select id from public.salons;
create function jovabook_private.referral_new_business() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into jovabook_private.referral_codes(salon_id) values(new.id);return new;end$$;
create trigger referral_new_business after insert on public.salons for each row execute function jovabook_private.referral_new_business();

create function jovabook_private.referral_code_valid(p_code text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from jovabook_private.referral_codes c join public.salons s on s.id=c.salon_id
 join jovabook_private.billing_accounts a on a.salon_id=s.id where c.code=upper(trim(p_code)) and a.deletion_state is null)
$$;
create function public.referral_code_valid(p_code text) returns boolean language sql stable set search_path='' begin atomic
 select jovabook_private.referral_code_valid(p_code);
end;

-- One atomic operation creates the business and its attribution, including retries after verification.
create function jovabook_private.create_referred_business(p_name text,p_slug text,p_owner text,p_referral_code text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;sid uuid;rid uuid;uid uuid:=auth.uid();fingerprint text;v_code text:=upper(trim(coalesce(p_referral_code,'')));
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Verify your email and sign in.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-referral-owner:'||uid::text));
 if exists(select 1 from public.salons where owner_id=uid) then raise exception 'This account already has a business.';end if;
 if v_code<>'' then
  if v_code!~'^[A-Z0-9]{10}$' or not jovabook_private.referral_code_valid(v_code) then raise exception 'Referral code not found. Check it with the business that invited you.' using errcode='22023';end if;
  select c.salon_id into rid from jovabook_private.referral_codes c join public.salons s on s.id=c.salon_id where c.code=v_code and s.owner_id<>uid;
  if rid is null then raise exception 'You cannot refer your own business.';end if;
  select jovabook_private.trial_fingerprint(email) into fingerprint from auth.users where id=uid;
  if exists(select 1 from jovabook_private.referrals where referred_fingerprint=fingerprint) then raise exception 'A referral has already been recorded for this account.';end if;
 end if;
 result:=public.create_business_for_existing_user(p_name,p_slug,p_owner);
 if result->>'ok' is distinct from 'true' then return result;end if;
 sid:=(result->>'salon_id')::uuid;
 if v_code<>'' then
  if not exists(select 1 from public.salons where id=sid and owner_id=uid) then raise exception 'Business ownership mismatch.' using errcode='42501';end if;
  insert into jovabook_private.referrals(referrer,referred,referred_fingerprint,business_name,referral_code)
   values(rid,sid,fingerprint,trim(p_name),v_code);
 end if;
 return result;
end$$;
create function public.create_referred_business(p_name text,p_slug text,p_owner text,p_referral_code text default '') returns jsonb
language sql set search_path='' begin atomic select jovabook_private.create_referred_business(p_name,p_slug,p_owner,p_referral_code);end;

create function jovabook_private.referral_summary(p_salon uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare code text;joined int;qualified int;earned int;available int;active_until timestamptz;begin
 if auth.uid() is null or not exists(select 1 from public.salons where id=p_salon and owner_id=auth.uid()) then raise exception 'Sign in as the business owner.' using errcode='42501';end if;
 select c.code into code from jovabook_private.referral_codes c where salon_id=p_salon;
 select count(*),count(*) filter(where status='qualified') into joined,qualified from jovabook_private.referrals where referrer=p_salon;
 select count(*) filter(where kind='referrer' and status<>'void'),count(*) filter(where status='available'),max(ends_at) filter(where status='active' and ends_at>now())
 into earned,available,active_until from jovabook_private.referral_rewards where salon_id=p_salon;
 if jovabook_private.offer_plan_before_referrals(p_salon)<>'essential' then active_until:=null;end if;
 return jsonb_build_object('code',code,'joined',joined,'qualified',qualified,'progress',qualified%3,'earned',earned,'available',available,'active_until',active_until,
 'can_claim',available>0 and coalesce(jovabook_private.offer_plan(p_salon),'essential')='essential' and not exists(select 1 from jovabook_private.offer_accounts where salon_id=p_salon and provider_status in('active','trialing','past_due','unpaid','incomplete')),
 'referred_by',exists(select 1 from jovabook_private.referrals where referred=p_salon),
 'referrals',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'business',r.business_name,'status',r.status,'joined_at',r.joined_at,'period_end',r.period_end,'ready',r.period_end<=now() and r.status='joined') order by r.joined_at desc),'[]'::jsonb) from jovabook_private.referrals r where referrer=p_salon));
end$$;
-- Piggyback on existing access refreshes. No new Vercel endpoint, timer or tracking request.
do $$declare src text;begin
 src:=pg_get_functiondef('public.owner_account_access()'::regprocedure);execute replace(src,'public.owner_account_access(','jovabook_private.owner_access_before_referrals(');
 src:=pg_get_functiondef('public.booking_offer_worker(text,text,jsonb)'::regprocedure);execute replace(src,'public.booking_offer_worker(','jovabook_private.offer_worker_before_referrals(');
 src:=pg_get_functiondef('jovabook_private.offer_plan(uuid)'::regprocedure);execute replace(src,'jovabook_private.offer_plan(','jovabook_private.offer_plan_before_referrals(');
end$$;
create or replace function public.owner_account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 result:=jovabook_private.owner_access_before_referrals();
 if result->'business'->>'id' is not null and result->>'team' is distinct from 'true' and exists(select 1 from public.salons where id=(result->'business'->>'id')::uuid and owner_id=auth.uid()) then
  result:=result||jsonb_build_object('referrals',jovabook_private.referral_summary((result->'business'->>'id')::uuid));
  if result->'referrals'->>'active_until' is not null then result:=result||jsonb_build_object('full_until',result->'referrals'->>'active_until','billing',(result->'billing')||jsonb_build_object('referral_access_until',result->'referrals'->>'active_until','paid_subscription',false));end if;
 end if;return result;
end$$;
create or replace function jovabook_private.offer_plan(p_salon uuid) returns text language sql stable security definer set search_path='' as $$
 select case when coalesce(jovabook_private.offer_plan_before_referrals(p_salon),'essential')='essential' and exists(select 1 from jovabook_private.referral_rewards where salon_id=p_salon and status='active' and starts_at<=now() and ends_at>now()) then 'standard' else jovabook_private.offer_plan_before_referrals(p_salon) end
$$;

-- Billing evidence is server supplied after canonical Stripe verification. Qualification is still reviewed.
create or replace function public.booking_offer_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;sid uuid;e jsonb;begin
 result:=jovabook_private.offer_worker_before_referrals(p_token,p_action,p_payload);
 if result is null then return null;end if;
 sid:=coalesce((result->>'salon_id')::uuid,(p_payload->>'salon')::uuid);
 if p_action='context' then
  return result||jsonb_build_object('referral',(select jsonb_build_object('invoice_id',r.invoice_id,'status',r.status) from jovabook_private.referrals r where r.referred=sid),
   'referral_reward_invoices',(select coalesce(jsonb_agg(invoice_id),'[]') from jovabook_private.referral_rewards where salon_id=sid and status in('scheduled','redeemed') and invoice_id is not null));
 elsif p_action='sync_apply' and result->>'stale' is distinct from 'true' then
  e:=p_payload->'referral_evidence';
  if jsonb_typeof(e)='object' and e->>'cadence'='monthly' and e->>'plan' in('standard','premium') and coalesce(e->>'invoice_id','')~'^in_[A-Za-z0-9]+$'
   and (e->>'amount_paid')::bigint>0 and (e->>'period_end')::timestamptz>(e->>'period_start')::timestamptz
   and (e->>'period_end')::timestamptz<=(e->>'period_start')::timestamptz+interval '1 month 1 day'
   and (e->>'period_end')::timestamptz>=(e->>'period_start')::timestamptz+interval '27 days'
   and e->>'subscription_id'=p_payload->>'subscription_id' then
   update jovabook_private.referrals set invoice_id=e->>'invoice_id',subscription_id=e->>'subscription_id',amount_paid=(e->>'amount_paid')::bigint,
    plan=e->>'plan',period_start=(e->>'period_start')::timestamptz,period_end=(e->>'period_end')::timestamptz,proof_verified_at=now()
    where referred=sid and invoice_id is null and status='joined' and joined_at<=(e->>'period_start')::timestamptz;
  end if;
 end if;return result;
end$$;

create function jovabook_private.claim_referral_reward(p_reward uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid uuid;r jovabook_private.referral_rewards;begin
 select id into sid from public.salons where owner_id=auth.uid();if sid is null then raise exception 'Sign in as the business owner.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 select * into r from jovabook_private.referral_rewards where id=p_reward and salon_id=sid for update;
 if r.id is null then raise exception 'Reward unavailable.';end if;
 if r.status='active' then return jsonb_build_object('ok',true,'ends_at',r.ends_at);end if;
 if r.status<>'available' or jovabook_private.offer_plan(sid)<>'essential' or exists(select 1 from jovabook_private.offer_accounts where salon_id=sid and provider_status in('active','trialing','past_due','unpaid','incomplete'))
 or not jovabook_private.billing_open(sid) then raise exception 'This reward can be claimed on Free with no pending paid subscription. Paid-plan rewards need a monthly renewal review.';end if;
 update jovabook_private.referral_rewards set status='active',starts_at=now(),ends_at=now()+interval '1 month' where id=r.id;
 return jsonb_build_object('ok',true,'ends_at',now()+interval '1 month');
end$$;
create function public.claim_referral_reward(p_reward uuid) returns jsonb language sql set search_path='' begin atomic select jovabook_private.claim_referral_reward(p_reward);end;

create function jovabook_private.operator_referrals() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform jovabook_private.require_operator();return jsonb_build_object('ok',true,
 'referrals',(select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('referrer_name',s.name,'ready',r.period_end<=now()) order by r.joined_at desc),'[]') from jovabook_private.referrals r left join public.salons s on s.id=r.referrer),
 'rewards',(select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('business',s.name,'plan',jovabook_private.offer_plan(s.id),'cadence',a.cadence) order by r.created_at desc),'[]') from jovabook_private.referral_rewards r left join public.salons s on s.id=r.salon_id left join jovabook_private.offer_accounts a on a.salon_id=s.id));end$$;
create function public.operator_referrals() returns jsonb language sql stable set search_path='' begin atomic select jovabook_private.operator_referrals();end;
create function jovabook_private.operator_referral_action(p_id uuid,p_action text,p_note text,p_invoice text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r jovabook_private.referrals;reward jovabook_private.referral_rewards;n int;sid uuid;p text;begin
 perform jovabook_private.require_operator();
 if length(trim(coalesce(p_note,''))) not between 10 and 1000 then raise exception 'Add a review note of 10 to 1000 characters.';end if;
 if p_action in('qualify','reject') then
  select * into r from jovabook_private.referrals where id=p_id for update;if r.id is null then raise exception 'Referral not found.';end if;
  if p_action='qualify' then
   if r.status='qualified' then return jsonb_build_object('ok',true);end if;
   if r.status<>'joined' or r.referrer is null or r.referred is null or r.invoice_id is null or r.period_end>now() or r.period_end is null or r.amount_paid<=0 then raise exception 'A completed paid monthly cycle and two active businesses are required.';end if;
   if p_invoice is distinct from r.invoice_id then raise exception 'Confirm the verified first paid invoice ID.';end if;
   perform pg_advisory_xact_lock(hashtext('jovabook-referrer:'||r.referrer::text));
   update jovabook_private.referrals set status='qualified',qualified_at=now(),reviewed_by=auth.uid(),review_note=trim(p_note) where id=r.id;
   insert into jovabook_private.referral_rewards(salon_id,source,kind) values(r.referred,'welcome:'||r.id::text,'welcome') on conflict(source) do nothing;
   select count(*) into n from jovabook_private.referrals where referrer=r.referrer and status='qualified';
   if n%3=0 then insert into jovabook_private.referral_rewards(salon_id,source,kind) values(r.referrer,'batch:'||r.referrer::text||':'||(n/3)::text,'referrer') on conflict(source) do nothing;end if;
  else
   if r.status='qualified' then raise exception 'A qualified referral needs a separate financial review; do not remove issued rewards silently.';end if;
   update jovabook_private.referrals set status='rejected',reviewed_by=auth.uid(),review_note=trim(p_note) where id=r.id;
  end if;
 elsif p_action in('schedule','redeem','void') then
  select salon_id into sid from jovabook_private.referral_rewards where id=p_id;if sid is null then raise exception 'Reward unavailable.';end if;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
  select * into reward from jovabook_private.referral_rewards where id=p_id for update;if reward.id is null then raise exception 'Reward unavailable.';end if;
  if p_action='void' then
   if reward.status<>'available' then raise exception 'Only unused rewards can be voided here.';end if;
   update jovabook_private.referral_rewards set status='void',reviewed_by=auth.uid(),review_note=trim(p_note) where id=p_id;
  else
   sid:=reward.salon_id;perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));p:=jovabook_private.offer_plan(sid);
   if sid is null or p not in('standard','premium') or not exists(select 1 from jovabook_private.offer_accounts where salon_id=sid and cadence='monthly' and provider_status='active') then raise exception 'An active monthly Solo or Team plan is required. Never discount an annual invoice.';end if;
   if coalesce(p_invoice,'')!~'^in_[A-Za-z0-9]+$' then raise exception 'Record the Stripe invoice ID.';end if;
   if p_action='schedule' then
    if reward.status='scheduled' and reward.invoice_id=p_invoice then return jsonb_build_object('ok',true);end if;
    if reward.status<>'available' then raise exception 'This reward is already assigned.';end if;
    if exists(select 1 from jovabook_private.referral_rewards where salon_id=sid and status='scheduled') then raise exception 'Finish the earlier scheduled reward before assigning another.';end if;
    update jovabook_private.referral_rewards set status='scheduled',invoice_id=p_invoice,base_amount=case when p='premium' then 2500 else 2000 end,reviewed_by=auth.uid(),review_note=trim(p_note) where id=p_id;
   else
    if reward.status='redeemed' and reward.invoice_id=p_invoice then return jsonb_build_object('ok',true);end if;
    if reward.status<>'scheduled' or reward.invoice_id is distinct from p_invoice then raise exception 'Confirm the invoice already assigned to this reward.';end if;
    update jovabook_private.referral_rewards set status='redeemed',reviewed_by=auth.uid(),review_note=trim(p_note) where id=p_id;
   end if;
  end if;
 else raise exception 'Unknown referral action.';end if;
 insert into jovabook_private.operator_audit(actor_id,action,salon_id) values(auth.uid(),'referral_'||p_action,coalesce(r.referred,reward.salon_id));
 return jsonb_build_object('ok',true);
end$$;
create function public.operator_referral_action(p_id uuid,p_action text,p_note text,p_invoice text default null) returns jsonb language sql set search_path='' begin atomic select jovabook_private.operator_referral_action(p_id,p_action,p_note,p_invoice);end;

-- Include claimable IDs only in the owner's authenticated response.
do $$declare src text;begin
 src:=pg_get_functiondef('jovabook_private.referral_summary(uuid)'::regprocedure);
 execute replace(src,'''can_claim'',available>0','''claimable_reward'',(select id from jovabook_private.referral_rewards where salon_id=p_salon and status=''available'' order by created_at,id limit 1),''can_claim'',available>0');
end$$;
revoke all on function jovabook_private.referral_new_business(),jovabook_private.owner_access_before_referrals(),jovabook_private.offer_worker_before_referrals(text,text,jsonb),jovabook_private.offer_plan_before_referrals(uuid),jovabook_private.referral_code_valid(text),jovabook_private.create_referred_business(text,text,text,text),jovabook_private.referral_summary(uuid),jovabook_private.claim_referral_reward(uuid),jovabook_private.operator_referrals(),jovabook_private.operator_referral_action(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.referral_code_valid(text),public.create_referred_business(text,text,text,text),public.claim_referral_reward(uuid),public.operator_referrals(),public.operator_referral_action(uuid,text,text,text) from public,anon,authenticated;
grant execute on function jovabook_private.referral_code_valid(text) to anon,authenticated;
grant execute on function jovabook_private.create_referred_business(text,text,text,text),jovabook_private.claim_referral_reward(uuid),jovabook_private.operator_referrals(),jovabook_private.operator_referral_action(uuid,text,text,text) to authenticated;
grant execute on function public.referral_code_valid(text) to anon,authenticated;
grant execute on function public.create_referred_business(text,text,text,text),public.claim_referral_reward(uuid),public.operator_referrals(),public.operator_referral_action(uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
