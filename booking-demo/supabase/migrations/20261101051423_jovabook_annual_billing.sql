-- Annual subscription fees are prepaid. Appointment commission remains monthly.
-- No provider identifiers, configuration switches or existing plans are changed.
begin;
alter table jovabook_private.billing_accounts
 add column paid_cadence text not null default 'monthly' check(paid_cadence in('monthly','annual')),
 add column pending_cadence text check(pending_cadence in('monthly','annual')),
 add column subscription_anchor timestamptz,add column subscription_period_start timestamptz;
alter table jovabook_private.billing_actions add column cadence text not null default 'monthly' check(cadence in('monthly','annual'));
alter table jovabook_private.commission_config add column annual_invoice_enabled boolean not null default false;
alter table jovabook_private.commission_periods
 add column cadence text not null default 'monthly' check(cadence in('monthly','annual')),
 add column next_cadence text not null default 'monthly' check(next_cadence in('monthly','annual')),
 add column subscription_period_start timestamptz,add column subscription_period_end timestamptz,add column subscription_anchor timestamptz;
create table jovabook_private.commission_invoice_cycles(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null references public.salons(id) on delete cascade,
 customer_id text not null,subscription_id text not null,cutoff timestamptz not null,
 invoice_id text unique,created_at timestamptz not null default clock_timestamp(),
 unique(salon_id,subscription_id,cutoff));
alter table jovabook_private.commission_invoice_cycles enable row level security;
revoke all on jovabook_private.commission_invoice_cycles from public,anon,authenticated;
do $$declare source text;begin
 source:=pg_get_functiondef('jovabook_private.billing_customer_pending(uuid)'::regprocedure);
 execute replace(source,'jovabook_private.billing_customer_pending(','jovabook_private.billing_customer_pending_before_annual(');
end$$;
create or replace function jovabook_private.billing_customer_pending(p_salon uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select jovabook_private.billing_customer_pending_before_annual(p_salon) or exists(
 select 1 from jovabook_private.commission_invoice_cycles c where c.salon_id=p_salon and
 (c.invoice_id is null or not exists(select 1 from jovabook_private.commission_batches b where b.invoice_id=c.invoice_id)))
$$;
revoke all on function jovabook_private.billing_customer_pending_before_annual(uuid),jovabook_private.billing_customer_pending(uuid) from public,anon,authenticated;

-- Keep the audited monthly worker as a private implementation, not another API.
do $$declare source text;begin
 source:=pg_get_functiondef('public.booking_billing_worker(text,text,jsonb)'::regprocedure);
 execute replace(source,'public.booking_billing_worker(','jovabook_private.billing_worker_monthly(');
end$$;
revoke all on function jovabook_private.billing_worker_monthly(text,text,jsonb) from public,anon,authenticated;
do $$declare source text;begin
 source:=pg_get_functiondef('public.owner_account_access()'::regprocedure);
 execute replace(source,'public.owner_account_access(','jovabook_private.owner_account_access_monthly(');
end$$;
create or replace function public.owner_account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare base jsonb;account jovabook_private.billing_accounts;begin
 base:=jovabook_private.owner_account_access_monthly();
 if base->>'business' is null then return base;end if;
 select * into account from jovabook_private.billing_accounts where salon_id=(base->'business'->>'id')::uuid;
 return base||jsonb_build_object('billing',coalesce(base->'billing','{}')||jsonb_build_object(
 'annual_schema_supported',true,'annual_supported',false,'cadence',account.paid_cadence,'pending_cadence',account.pending_cadence,
 'subscription_period_start',account.subscription_period_start,'subscription_period_end',account.current_period_end));
end
$$;
revoke all on function jovabook_private.owner_account_access_monthly(),public.owner_account_access() from public,anon,authenticated;
grant execute on function public.owner_account_access() to authenticated;

create or replace function public.booking_billing_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare proof jsonb;v_result jsonb;sid uuid;account jovabook_private.billing_accounts;action jovabook_private.billing_actions;config jovabook_private.billing_config;v_cadence text;target text;begin
 -- This also verifies the existing worker/lifecycle token before any new path.
 if p_action like 'lifecycle_%' or p_action in('event_begin','event_finish') then return jovabook_private.billing_worker_monthly(p_token,p_action,p_payload);end if;
 select * into config from jovabook_private.billing_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or config.worker_hash is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>config.worker_hash then raise exception 'Invalid billing worker credentials.' using errcode='42501';end if;
 if p_payload ? 'customer' and not p_payload ? 'salon' then select salon_id into sid from jovabook_private.billing_accounts where customer_id=p_payload->>'customer';else sid:=(p_payload->>'salon')::uuid;end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 proof:=jovabook_private.billing_worker_monthly(p_token,'context',p_payload);if proof is null then return null;end if;
 select * into account from jovabook_private.billing_accounts where salon_id=sid for update;
 v_cadence:=coalesce(p_payload->>'cadence','monthly');target:=p_payload->>'target';
 if v_cadence not in('monthly','annual') then raise exception 'Choose monthly or annual billing.';end if;
 if p_action='context' then return proof||jsonb_build_object('annual_supported',true,'paid_cadence',account.paid_cadence,'pending_cadence',account.pending_cadence,'pending_effective_at',account.pending_effective_at,'subscription_anchor',account.subscription_anchor,'subscription_period_start',account.subscription_period_start);end if;
 if p_action='action_lookup' then
  select * into action from jovabook_private.billing_actions where salon_id=sid and request_id=(p_payload->>'request')::uuid;
  if action.id is not null and action.cadence<>v_cadence then raise exception 'Billing frequency changed. Start a fresh review.';end if;
 elsif p_action='action_begin' then
  if p_payload->>'kind'='schedule' then
   if not (proof->>'enabled')::boolean or account.deletion_state is not null or not account.ever_paid then raise exception 'Billing unavailable.';end if;
   if target not in('essential','standard','premium') or v_cadence=account.paid_cadence then raise exception 'Choose a different billing frequency.';end if;
   select * into action from jovabook_private.billing_actions where salon_id=sid and request_id=(p_payload->>'request')::uuid;
   if action.id is not null then if action.request_hash<>p_payload->>'hash' or action.cadence<>v_cadence then raise exception 'Billing request changed.';end if;return to_jsonb(action);end if;
   if account.pending_target is not null or account.schedule_id is not null or exists(select 1 from jovabook_private.billing_actions where salon_id=sid and status in('pending','unknown','awaiting_provider')) then raise exception 'Resolve the existing scheduled change first.';end if;
   if (select count(*) from public.staff where salon_id=sid)>public.plan_staff_limit(target) then raise exception 'Reduce staff first. Inactive staff count and future bookings remain protected.' using errcode='23514';end if;
   update jovabook_private.billing_accounts set pending_target=target,pending_cadence=v_cadence where salon_id=sid;
   insert into jovabook_private.billing_actions(salon_id,request_id,kind,target,request_hash,cadence) values(sid,(p_payload->>'request')::uuid,'schedule',target,p_payload->>'hash',v_cadence) returning * into action;return to_jsonb(action);
  end if;
 elsif p_action='schedule_hold' then
  if account.pending_target is distinct from target or account.pending_cadence is distinct from v_cadence then raise exception 'The reviewed scheduled change changed.';end if;
  if (select count(*) from public.staff where salon_id=sid)>public.plan_staff_limit(target) then raise exception 'Reduce staff first. Inactive staff count and future bookings remain protected.' using errcode='23514';end if;
  return jsonb_build_object('ok',true);
 elsif p_action='sync_apply' then
  if p_payload ? 'cadence' and (p_payload->>'cadence') not in('monthly','annual') then raise exception 'Unverified provider billing frequency.';end if;
  if coalesce((p_payload->>'paid_verified')::boolean,false) and v_cadence='annual' and
   ((p_payload->>'subscription_anchor')::timestamptz is null or (p_payload->>'subscription_period_start')::timestamptz is null or
   (p_payload->>'subscription_anchor')::timestamptz>(p_payload->>'subscription_period_start')::timestamptz or (p_payload->>'paid_until')::timestamptz<=(p_payload->>'subscription_period_start')::timestamptz) then raise exception 'Annual anniversary could not be verified.';end if;
 end if;
 v_result:=jovabook_private.billing_worker_monthly(p_token,p_action,p_payload);
 if p_action='action_begin' and v_result->>'id' is not null then
  if v_result->>'cadence' is distinct from v_cadence and v_result->>'cadence' is not null and (v_result->>'created_at')::timestamptz<clock_timestamp()-interval '1 minute' then raise exception 'Billing frequency changed.';end if;
  update jovabook_private.billing_actions set cadence=v_cadence where id=(v_result->>'id')::uuid and salon_id=sid;
  if p_payload->>'kind'='downgrade' then update jovabook_private.billing_accounts set pending_cadence=v_cadence where salon_id=sid;end if;
  return v_result||jsonb_build_object('cadence',v_cadence);
 elsif p_action='sync_apply' and not coalesce((v_result->>'stale')::boolean,false) and coalesce((p_payload->>'paid_verified')::boolean,false) then
  update jovabook_private.billing_accounts set paid_cadence=v_cadence,subscription_anchor=(p_payload->>'subscription_anchor')::timestamptz,subscription_period_start=(p_payload->>'subscription_period_start')::timestamptz where salon_id=sid;
 elsif p_action='sync_apply' and not coalesce((v_result->>'stale')::boolean,false) and not account.ever_paid and coalesce((p_payload->>'historical_paid')::boolean,false) then
  if coalesce(p_payload->>'historical_cadence','monthly') not in('monthly','annual') then raise exception 'Historical billing frequency is unverified.';end if;
  update jovabook_private.billing_accounts set paid_cadence=coalesce(p_payload->>'historical_cadence','monthly'),subscription_anchor=(p_payload->>'subscription_anchor')::timestamptz,subscription_period_start=(p_payload->>'subscription_period_start')::timestamptz where salon_id=sid;
 elsif p_action='downgrade_release' then update jovabook_private.billing_accounts set pending_cadence=null where salon_id=sid;
 end if;
 return v_result;
end$$;
revoke all on function public.booking_billing_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_billing_worker(text,text,jsonb) to anon,authenticated;

create function jovabook_private.commission_terms_current(p_version text) returns boolean language sql immutable set search_path='' as $$select coalesce(p_version in('2026-11-01-appointment-v1','2026-11-01-annual-monthly-v2'),false)$$;
revoke all on function jovabook_private.commission_terms_current(text) from public,anon,authenticated;
-- Widen only the explicitly approved terms predicate. Preserve all existing
-- booking, invoice, retry, credit and retention protections in the prior worker.
do $$declare source text;begin
 source:=pg_get_functiondef('jovabook_private.commission_accrue(uuid)'::regprocedure);
 if strpos(source,'account.commission_terms_version is distinct from ''2026-11-01-appointment-v1''')=0 then raise exception 'Unexpected commission accrual foundation.';end if;
 execute replace(source,'account.commission_terms_version is distinct from ''2026-11-01-appointment-v1''','not jovabook_private.commission_terms_current(account.commission_terms_version)');
 source:=pg_get_functiondef('public.booking_commission_worker(text,text,jsonb)'::regprocedure);
 if strpos(source,'account.commission_terms_version is distinct from ''2026-11-01-appointment-v1''')=0 then raise exception 'Unexpected commission worker foundation.';end if;
 source:=replace(source,'account.commission_terms_version is distinct from ''2026-11-01-appointment-v1''','not jovabook_private.commission_terms_current(account.commission_terms_version)');
 source:=replace(source,'commission_terms_version=''2026-11-01-appointment-v1''','jovabook_private.commission_terms_current(commission_terms_version)');execute source;
end$$;
do $$declare source text;begin
 source:=pg_get_functiondef('public.booking_commission_worker(text,text,jsonb)'::regprocedure);
 execute replace(source,'public.booking_commission_worker(','jovabook_private.commission_worker_monthly(');
end$$;
revoke all on function jovabook_private.commission_worker_monthly(text,text,jsonb) from public,anon,authenticated;

create or replace function jovabook_private.commission_refresh_summary(p_salon uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare period jovabook_private.commission_periods;account jovabook_private.billing_accounts;fresh bigint;carry bigint;debt bigint;base bigint;available boolean;v_result jsonb;begin
 select * into period from jovabook_private.commission_periods where salon_id=p_salon;
 select * into account from jovabook_private.billing_accounts where salon_id=p_salon;
 if period.salon_id is null then return jsonb_build_object('available',false,'currency','gbp');end if;
 select coalesce(sum(amount_minor) filter(where service_at>=period.period_start and service_at<period.period_end),0),coalesce(sum(amount_minor) filter(where service_at<period.period_start),0) into fresh,carry from jovabook_private.commission_entries where salon_id=p_salon and status='open';
 select coalesce(sum(greatest(0,cb.amount_minor-coalesce((select sum(ca.amount_minor) from jovabook_private.commission_credit_actions ca where ca.batch_id=cb.id and ca.status='issued'),0))),0) into debt from jovabook_private.commission_batches cb where cb.salon_id=p_salon and cb.status='invoiced';
 base:=case when account.cancel_at_period_end or period.subscription_period_end<=clock_timestamp() or period.cadence='annual' and period.period_end<period.subscription_period_end then 0 else case period.next_plan when 'essential' then 2000 when 'standard' then 5000 when 'premium' then 10000 end * case when period.next_cadence='annual' then 9.6 else 1 end end;
 available:=not exists(select 1 from jovabook_private.commission_entries where salon_id=p_salon and (review_required or status='needs_history' or kind='cancellation_credit' and status in('open','reserved'))) and not exists(select 1 from jovabook_private.commission_batches where salon_id=p_salon and status in('reserved','needs_attention')) and not exists(select 1 from jovabook_private.commission_invoice_cycles c where c.salon_id=p_salon and (c.invoice_id is null or not exists(select 1 from jovabook_private.commission_batches b where b.invoice_id=c.invoice_id)));
 v_result:=jsonb_build_object('available',available,'currency','gbp','cadence',period.cadence,'commission_cadence','monthly','period_start',period.period_start,'period_end',period.period_end,'subscription_due_at',coalesce(period.subscription_period_end,period.period_end),'subscription_next_cadence',period.next_cadence,'subscription_amount_pence',base,'new_commission_pence',fresh,'carry_forward_pence',carry,'customer_credit_pence',period.customer_credit_minor,'estimated_total_pence',greatest(0,base+fresh+carry-period.customer_credit_minor),'unpaid_invoiced_pence',debt,'updated_at',clock_timestamp(),'next_refresh_at',clock_timestamp()+interval '24 hours');
 insert into jovabook_private.commission_summaries(salon_id,summary,updated_at) values(p_salon,v_result,clock_timestamp()) on conflict(salon_id) do update set summary=excluded.summary,updated_at=excluded.updated_at;return v_result;
end$$;

create or replace function public.booking_commission_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare proof jsonb;v_result jsonb;sid uuid;account jovabook_private.billing_accounts;cycle jovabook_private.commission_invoice_cycles;batch jovabook_private.commission_batches;period jovabook_private.commission_periods;v_cadence text;v_cutoff timestamptz;version text;begin
 proof:=jovabook_private.commission_worker_monthly(p_token,'context',p_payload);if proof is null or coalesce((proof->>'disabled')::boolean,false) then
  if p_action='summary' then return jovabook_private.commission_worker_monthly(p_token,p_action,p_payload);end if;return proof;end if;
 sid:=(p_payload->>'salon')::uuid;perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));select * into account from jovabook_private.billing_accounts where salon_id=sid for update;
 v_cadence:=coalesce(p_payload->>'cadence','monthly');
 if p_action='collection_begin' and exists(select 1 from jovabook_private.commission_invoice_cycles where salon_id=sid and invoice_id=p_payload->>'invoice') then
  select * into batch from jovabook_private.commission_batches where id=(p_payload->>'batch')::uuid and salon_id=sid and invoice_id=p_payload->>'invoice' and customer_id=p_payload->>'customer' for update;
  if batch.id is null then raise exception 'Annual commission collection binding changed.';end if;
  -- One worker may initiate each monetary stage. An unknown response is read
  -- back, not submitted again by another worker or a later blind retry.
  if batch.status='paid' or p_payload->>'stage'='finalize' and batch.finalize_started_at is not null or p_payload->>'stage'='pay' and batch.pay_started_at is not null then return null;end if;
 elsif p_action='accept_terms' and v_cadence='annual' then
  if p_payload->>'version' is distinct from '2026-11-01-annual-monthly-v2' or account.deletion_state is not null then raise exception 'Review the annual subscription and separate monthly commission.';end if;
  if not exists(select 1 from jovabook_private.billing_actions where salon_id=sid and id=(p_payload->>'action')::uuid and target=p_payload->>'plan' and cadence='annual' and kind in('checkout','upgrade','downgrade','schedule')) then raise exception 'Annual billing review binding changed.';end if;
  update jovabook_private.billing_actions set commission_terms_version=p_payload->>'version',commission_terms_accepted_at=coalesce(commission_terms_accepted_at,clock_timestamp()),commission_terms=jsonb_build_object('version',p_payload->>'version','plan',p_payload->>'plan','cadence','annual','base_amount_pence',case p_payload->>'plan' when 'essential' then 19200 when 'standard' then 48000 when 'premium' then 96000 end,'discount_percent',20,'paid_upfront',true,'commission_bps',case p_payload->>'plan' when 'premium' then 0 else 100 end,'basis','full_service_price','recognition','appointment_instant','cycle','calendar_month_subscription_anniversary_utc','cancelled_excluded',true,'no_show_excluded',true,'free_trial_excluded',true) where salon_id=sid and id=(p_payload->>'action')::uuid;
  update jovabook_private.billing_accounts set commission_terms_version=p_payload->>'version',commission_terms_accepted_at=clock_timestamp() where salon_id=sid;return jsonb_build_object('ok',true);
 elsif p_action in('cycle_begin','cycle_bind') then
  if not (select annual_invoice_enabled and invoice_enabled from jovabook_private.commission_config where singleton) or account.deletion_state is not null or account.commission_terms_version is distinct from '2026-11-01-annual-monthly-v2' or account.commission_terms_accepted_at is null then return null;end if;
  select * into period from jovabook_private.commission_periods where salon_id=sid;
  v_cutoff:=case when period.subscription_period_end<=clock_timestamp() then period.subscription_period_end else period.period_start end;
  if period.cadence<>'annual' or period.period_start>(clock_timestamp()+interval '5 seconds') or account.customer_id is distinct from p_payload->>'customer' or account.subscription_id is distinct from p_payload->>'subscription' then raise exception 'Monthly annual-commission cycle is unverified.';end if;
  if p_action='cycle_begin' then
   if v_cutoff is distinct from (p_payload->>'cutoff')::timestamptz then raise exception 'Monthly commission cutoff changed.';end if;
   select c.* into cycle from jovabook_private.commission_invoice_cycles c where c.salon_id=sid and c.subscription_id=account.subscription_id and (c.invoice_id is null or not exists(select 1 from jovabook_private.commission_batches b where b.invoice_id=c.invoice_id)) order by c.cutoff limit 1;
   if cycle.id is not null then return to_jsonb(cycle);end if;
   select * into cycle from jovabook_private.commission_invoice_cycles where salon_id=sid and subscription_id=account.subscription_id and cutoff=v_cutoff;
   if cycle.id is not null then return to_jsonb(cycle);end if;
   perform jovabook_private.commission_accrue(sid);
   if exists(select 1 from jovabook_private.commission_entries where salon_id=sid and (review_required or status='needs_history')) then raise exception 'Commission history needs review before collection.';end if;
   if coalesce((select sum(amount_minor) from jovabook_private.commission_entries where salon_id=sid and status='open' and kind='service' and service_at<v_cutoff),0)<=0 then return null;end if;
   insert into jovabook_private.commission_invoice_cycles(salon_id,customer_id,subscription_id,cutoff) values(sid,account.customer_id,account.subscription_id,v_cutoff) returning * into cycle;perform jovabook_private.commission_refresh_summary(sid);return to_jsonb(cycle);
  end if;
  select * into cycle from jovabook_private.commission_invoice_cycles where id=(p_payload->>'cycle')::uuid and salon_id=sid and subscription_id=account.subscription_id and cutoff=(p_payload->>'cutoff')::timestamptz and cutoff<=v_cutoff for update;
  if cycle.id is null or coalesce(p_payload->>'invoice','')!~'^in_[A-Za-z0-9]+$' or cycle.invoice_id is not null and cycle.invoice_id<>p_payload->>'invoice' then raise exception 'Commission cycle invoice binding changed.';end if;
  update jovabook_private.commission_invoice_cycles set invoice_id=p_payload->>'invoice' where id=cycle.id;return jsonb_build_object('ok',true);
 end if;
 -- A scheduled cadence change has its own audited receipt even before activation.
 if p_action='accept_terms' and v_cadence='monthly' and exists(select 1 from jovabook_private.billing_actions where id=(p_payload->>'action')::uuid and salon_id=sid and kind='schedule') then
  if p_payload->>'version' is distinct from '2026-11-01-appointment-v1' then raise exception 'Review current monthly billing terms.';end if;
  update jovabook_private.billing_actions set kind='downgrade' where id=(p_payload->>'action')::uuid and salon_id=sid;
  v_result:=jovabook_private.commission_worker_monthly(p_token,p_action,p_payload);
  update jovabook_private.billing_actions set kind='schedule' where id=(p_payload->>'action')::uuid and salon_id=sid;
  if account.paid_cadence='annual' then update jovabook_private.billing_accounts set commission_terms_version=account.commission_terms_version,commission_terms_accepted_at=account.commission_terms_accepted_at where salon_id=sid;end if;return v_result;
 end if;
 v_result:=jovabook_private.commission_worker_monthly(p_token,p_action,p_payload);
 if p_action='context' then return v_result||jsonb_build_object('annual_invoice_enabled',(select annual_invoice_enabled from jovabook_private.commission_config where singleton));
 elsif p_action='summary' then return v_result||jsonb_build_object('annual_billing_ready',(select enabled and invoice_enabled and annual_invoice_enabled from jovabook_private.commission_config where singleton),
  'supervisor_ready',(select coalesce((to_jsonb(c)->>'supervisor_enabled')::boolean and (to_jsonb(c)->>'supervisor_operational_ready')::boolean and (to_jsonb(c)->>'supervisor_http_hash')~'^[0-9a-f]{64}$' and (to_jsonb(c)->>'supervisor_http_hash')<>c.worker_hash and p_payload->>'http_hash' is not distinct from to_jsonb(c)->>'supervisor_http_hash',false) from jovabook_private.commission_config c where singleton));
 elsif p_action='history' and v_result is not null then
  if v_cadence not in('monthly','annual') or coalesce(p_payload->>'next_cadence','monthly') not in('monthly','annual') then raise exception 'Unverified commission subscription frequency.';end if;
  if v_cadence='annual' and (account.commission_terms_version is distinct from '2026-11-01-annual-monthly-v2' or (p_payload->>'subscription_period_end')::timestamptz is null or (p_payload->>'subscription_anchor')::timestamptz is null or (p_payload->>'period_end')::timestamptz>(p_payload->>'subscription_period_end')::timestamptz) then raise exception 'Annual monthly-commission consent or anniversary is missing.';end if;
  update jovabook_private.commission_periods set cadence=v_cadence,next_cadence=coalesce(p_payload->>'next_cadence','monthly'),subscription_period_start=(p_payload->>'subscription_period_start')::timestamptz,subscription_period_end=(p_payload->>'subscription_period_end')::timestamptz,subscription_anchor=(p_payload->>'subscription_anchor')::timestamptz where salon_id=sid;
  return jovabook_private.commission_refresh_summary(sid);
 end if;return v_result;
end$$;
revoke all on function public.booking_commission_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_commission_worker(text,text,jsonb) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
