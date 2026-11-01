-- Appointment-time commission. No provider operation is enabled by this file.
create table jovabook_private.commission_config(
 singleton boolean primary key default true check(singleton),enabled boolean not null default false,
 invoice_enabled boolean not null default false,enabled_at timestamptz,worker_hash text
);
insert into jovabook_private.commission_config(singleton) values(true);
alter table jovabook_private.billing_accounts add column commission_terms_version text,add column commission_terms_accepted_at timestamptz;
alter table jovabook_private.billing_actions add column commission_terms_version text,add column commission_terms_accepted_at timestamptz,add column commission_terms jsonb;
create table jovabook_private.commission_booking_events(
 id bigserial primary key,salon_id uuid not null references public.salons(id) on delete cascade,
 booking_id text not null,observed_at timestamptz not null default clock_timestamp(),
 service_at timestamptz,full_price_minor bigint not null check(full_price_minor>=0),
 status text not null,deleted boolean not null default false
);
create index commission_booking_timeline on jovabook_private.commission_booking_events(salon_id,booking_id,id);
create table jovabook_private.commission_plan_history(
 salon_id uuid not null references public.salons(id) on delete cascade,invoice_id text not null,line_id text not null,
 subscription_id text not null,plan text not null check(plan in('essential','standard','premium')),
 effective_start timestamptz not null,period_end timestamptz not null check(period_end>effective_start),
 verified_at timestamptz not null default now(),primary key(salon_id,invoice_id,line_id)
);
create table jovabook_private.commission_periods(
 salon_id uuid primary key references public.salons(id) on delete cascade,customer_id text not null,subscription_id text not null,
 period_start timestamptz not null,period_end timestamptz not null check(period_end>period_start),
 next_plan text not null check(next_plan in('essential','standard','premium')),customer_credit_minor bigint not null default 0 check(customer_credit_minor>=0),
 fence uuid,updated_at timestamptz not null default now()
);
create table jovabook_private.commission_entries(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null references public.salons(id) on delete cascade,
 booking_id text not null,kind text not null check(kind in('service','cancellation_credit')),
 service_at timestamptz not null,full_price_minor bigint not null check(full_price_minor>=0),
 rate_bps int check(rate_bps in(0,100)),amount_minor bigint,
 history_invoice text,history_line text,status text not null check(status in('needs_history','open','reserved','invoiced','paid','void','waived_trial')),review_required boolean not null default false,
 created_at timestamptz not null default now(),unique(salon_id,booking_id,kind,service_at),
 check(amount_minor is null or kind='service' and amount_minor>=0 or kind='cancellation_credit' and amount_minor<=0)
);
create table jovabook_private.commission_batches(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null references public.salons(id) on delete cascade,
 invoice_id text not null unique,customer_id text not null,subscription_id text not null,cutoff timestamptz not null,
 amount_minor bigint not null,entry_count int not null,digest text not null,provider_item_id text unique,
 status text not null default 'reserved' check(status in('reserved','invoiced','paid','void','needs_attention')),
 finalize_started_at timestamptz,pay_started_at timestamptz,collection_state text not null default 'not_started',settlement_kind text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table jovabook_private.commission_allocations(
 batch_id uuid not null references jovabook_private.commission_batches(id) on delete cascade,
 entry_id uuid not null references jovabook_private.commission_entries(id) on delete cascade,
 active boolean not null default true,primary key(batch_id,entry_id)
);
create unique index commission_one_live_period_invoice on jovabook_private.commission_batches(salon_id,subscription_id,cutoff) where status<>'void';
create unique index commission_one_payable_allocation on jovabook_private.commission_allocations(entry_id) where active;
create table jovabook_private.commission_credit_actions(
 entry_id uuid primary key references jovabook_private.commission_entries(id) on delete cascade,
 batch_id uuid not null references jovabook_private.commission_batches(id) on delete cascade,
 invoice_id text not null,line_id text not null,customer_id text not null,amount_minor bigint not null check(amount_minor>0),
 credit_amount bigint not null check(credit_amount>=0),provider_id text unique,
 status text not null default 'reserved' check(status in('reserved','issued','needs_attention')),
 created_at timestamptz not null default now()
);
create table jovabook_private.commission_summaries(
 salon_id uuid primary key references public.salons(id) on delete cascade,summary jsonb not null,updated_at timestamptz not null default now()
);
-- Retain aggregate financial evidence, never names, email or customer bookings.
create table jovabook_private.commission_retention_audit(
 salon_id uuid primary key,closed_at timestamptz not null default now(),paid_minor bigint not null,
 unpaid_invoiced_minor bigint not null,unbilled_minor bigint not null,unresolved_occurrences int not null default 0,unresolved_full_price_minor bigint not null default 0
);
do $$declare t text;begin foreach t in array array['commission_config','commission_booking_events','commission_plan_history','commission_periods','commission_entries','commission_batches','commission_allocations','commission_credit_actions','commission_summaries','commission_retention_audit'] loop
 execute format('alter table jovabook_private.%I enable row level security',t);
 execute format('revoke all on jovabook_private.%I from public,anon,authenticated',t);
end loop;end$$;
revoke all on sequence jovabook_private.commission_booking_events_id_seq from public,anon,authenticated;

create function jovabook_private.commission_booking_event() returns trigger language plpgsql security definer set search_path='' as $$
declare b public.bookings;instant timestamptz;begin
 if TG_OP='DELETE' then b:=old;else b:=new;end if;
 if not exists(select 1 from public.salons where id=b.salon_id) then return coalesce(new,old);end if;
 if TG_OP='UPDATE' and (new.date,new.time,new.price,new.status) is not distinct from (old.date,old.time,old.price,old.status) then return new;end if;
 instant:=jovabook_private.sms_start(b);
 insert into jovabook_private.commission_booking_events(salon_id,booking_id,service_at,full_price_minor,status,deleted)
 values(b.salon_id,b.id,instant,round(b.price*100)::bigint,b.status,TG_OP='DELETE');
 return coalesce(new,old);
end$$;
create trigger commission_booking_event after insert or update or delete on public.bookings for each row execute function jovabook_private.commission_booking_event();
-- Snapshot existing rows for future service dates only. Past service is never
-- silently backfilled as a newly billable event at installation.
insert into jovabook_private.commission_booking_events(salon_id,booking_id,service_at,full_price_minor,status)
select b.salon_id,b.id,jovabook_private.sms_start(b),round(b.price*100)::bigint,b.status from public.bookings b where jovabook_private.sms_start(b)>clock_timestamp();

create function jovabook_private.commission_accrue(p_salon uuid) returns void language plpgsql security definer set search_path='' as $$
declare cfg jovabook_private.commission_config;account jovabook_private.billing_accounts;candidate record;entry jovabook_private.commission_entries;bps int;fee bigint;begin
 select * into cfg from jovabook_private.commission_config where singleton;
 if not cfg.enabled or cfg.enabled_at is null then return;end if;
 select * into account from jovabook_private.billing_accounts where salon_id=p_salon;
 if account.salon_id is null or account.deletion_state is not null or account.commission_terms_version is distinct from '2026-11-01-appointment-v1' or account.commission_terms_accepted_at is null then return;end if;
 for candidate in
 with timeline as (
  select e.*,lead(e.observed_at) over(partition by e.booking_id order by e.id) valid_until
  from jovabook_private.commission_booking_events e where e.salon_id=p_salon
 ), origins as (
  select distinct on(e.booking_id,e.service_at) e.* from timeline e
  where not e.deleted and e.status in('confirmed','completed') and e.service_at>=greatest(cfg.enabled_at,account.commission_terms_accepted_at) and e.service_at<=clock_timestamp()
   and e.observed_at<=e.service_at and (e.valid_until is null or e.valid_until>e.service_at)
  order by e.booking_id,e.service_at,e.id desc
 ), latest as (select distinct on(e.booking_id) e.booking_id,e.status,e.deleted,e.service_at from timeline e order by e.booking_id,e.id desc)
 select o.*,l.status latest_status,l.service_at latest_service_at,h.plan,h.invoice_id,h.line_id from origins o join latest l using(booking_id)
 left join lateral(select ph.* from jovabook_private.commission_plan_history ph where ph.salon_id=p_salon and ph.effective_start<=o.service_at and ph.period_end>o.service_at order by ph.effective_start desc,ph.verified_at desc limit 1) h on true
 loop
  select * into entry from jovabook_private.commission_entries ce where ce.salon_id=p_salon and ce.booking_id=candidate.booking_id and ce.service_at=candidate.service_at and ce.kind='service' for update;
  -- A restored occurrence must never silently reuse a void or credited charge.
  -- Keep the original immutable evidence and require an explicit financial review.
  if entry.id is not null and candidate.latest_status in('confirmed','completed') and candidate.latest_service_at=candidate.service_at
   and (entry.status='void' or exists(select 1 from jovabook_private.commission_entries credit where credit.salon_id=p_salon and credit.booking_id=entry.booking_id and credit.service_at=entry.service_at and credit.kind='cancellation_credit')) then
   update jovabook_private.commission_entries set review_required=true where id=entry.id;
  end if;
  if entry.id is null then
   if candidate.plan is null then
    insert into jovabook_private.commission_entries(salon_id,booking_id,kind,service_at,full_price_minor,status,rate_bps,amount_minor)
    values(p_salon,candidate.booking_id,'service',candidate.service_at,candidate.full_price_minor,
     case when (candidate.latest_status in('cancelled','no-show') or candidate.latest_service_at is distinct from candidate.service_at) then 'void' when candidate.service_at>=account.trial_started_at and candidate.service_at<account.trial_ends_at then 'waived_trial' else 'needs_history' end,
     null,null);
   else
    bps:=case when candidate.plan='premium' then 0 else 100 end;fee:=(candidate.full_price_minor*bps+5000)/10000;
    insert into jovabook_private.commission_entries(salon_id,booking_id,kind,service_at,full_price_minor,rate_bps,amount_minor,history_invoice,history_line,status)
    values(p_salon,candidate.booking_id,'service',candidate.service_at,candidate.full_price_minor,bps,fee,candidate.invoice_id,candidate.line_id,case when (candidate.latest_status in('cancelled','no-show') or candidate.latest_service_at is distinct from candidate.service_at) then 'void' else 'open' end);
   end if;
   select * into entry from jovabook_private.commission_entries ce where ce.salon_id=p_salon and ce.booking_id=candidate.booking_id and ce.service_at=candidate.service_at and ce.kind='service' for update;
  elsif entry.status='needs_history' and candidate.plan is not null then
   bps:=case when candidate.plan='premium' then 0 else 100 end;fee:=(entry.full_price_minor*bps+5000)/10000;
   update jovabook_private.commission_entries set rate_bps=bps,amount_minor=fee,history_invoice=candidate.invoice_id,history_line=candidate.line_id,status='open' where id=entry.id returning * into entry;
  end if;
  if (candidate.latest_status in('cancelled','no-show') or candidate.latest_service_at is distinct from candidate.service_at) then
   if entry.status in('open','needs_history') then update jovabook_private.commission_entries set status='void' where id=entry.id;
   elsif entry.status in('reserved','invoiced','paid') and entry.amount_minor>0 then
    insert into jovabook_private.commission_entries(salon_id,booking_id,kind,service_at,full_price_minor,rate_bps,amount_minor,history_invoice,history_line,status)
    values(p_salon,entry.booking_id,'cancellation_credit',entry.service_at,entry.full_price_minor,entry.rate_bps,-entry.amount_minor,entry.history_invoice,entry.history_line,'open') on conflict(salon_id,booking_id,kind,service_at) do nothing;
   end if;
  end if;
 end loop;
end$$;

create function jovabook_private.commission_refresh_summary(p_salon uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare period jovabook_private.commission_periods;fresh bigint;carry bigint;debt bigint;base bigint;available boolean;result jsonb;begin
 select * into period from jovabook_private.commission_periods where salon_id=p_salon;
 if period.salon_id is null then return jsonb_build_object('available',false,'currency','gbp');end if;
 select coalesce(sum(amount_minor) filter(where service_at>=period.period_start),0),coalesce(sum(amount_minor) filter(where service_at<period.period_start),0)
 into fresh,carry from jovabook_private.commission_entries where salon_id=p_salon and status='open';
 select coalesce(sum(greatest(0,cb.amount_minor-coalesce((select sum(ca.amount_minor) from jovabook_private.commission_credit_actions ca where ca.batch_id=cb.id and ca.status='issued'),0))),0) into debt from jovabook_private.commission_batches cb where cb.salon_id=p_salon and cb.status='invoiced';
 base:=case period.next_plan when 'essential' then 2000 when 'standard' then 5000 when 'premium' then 10000 end;
 available:=not exists(select 1 from jovabook_private.commission_entries where salon_id=p_salon and (review_required or status='needs_history' or kind='cancellation_credit' and status in('open','reserved')))
 and not exists(select 1 from jovabook_private.commission_batches where salon_id=p_salon and status in('reserved','needs_attention'));
 result:=jsonb_build_object('available',available,'currency','gbp','period_start',period.period_start,'period_end',period.period_end,
 'subscription_amount_pence',base,'new_commission_pence',fresh,'carry_forward_pence',carry,'customer_credit_pence',period.customer_credit_minor,'estimated_total_pence',greatest(0,base+fresh+carry-period.customer_credit_minor),
 'unpaid_invoiced_pence',debt,'updated_at',clock_timestamp(),'next_refresh_at',clock_timestamp()+interval '24 hours');
 insert into jovabook_private.commission_summaries(salon_id,summary,updated_at) values(p_salon,result,clock_timestamp()) on conflict(salon_id) do update set summary=excluded.summary,updated_at=excluded.updated_at;
 return result;
end$$;

create function public.booking_commission_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg jovabook_private.commission_config;account jovabook_private.billing_accounts;period jovabook_private.commission_periods;batch jovabook_private.commission_batches;sid uuid;item jsonb;existing jovabook_private.commission_plan_history;total bigint;n int;fingerprint text;result jsonb;begin
 select * into cfg from jovabook_private.commission_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or cfg.worker_hash is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>cfg.worker_hash then raise exception 'Invalid commission worker.' using errcode='42501';end if;
 sid:=(p_payload->>'salon')::uuid;
 if p_action='accept_terms' then
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
  select * into account from jovabook_private.billing_accounts where salon_id=sid for update;
  if account.salon_id is null or account.deletion_state is not null or p_payload->>'version' is distinct from '2026-11-01-appointment-v1' then raise exception 'Current billing terms must be reviewed.';end if;
  if not exists(select 1 from jovabook_private.billing_actions ba where ba.salon_id=sid and ba.id=(p_payload->>'action')::uuid and ba.kind in('checkout','upgrade','downgrade') and ba.target=p_payload->>'plan') then raise exception 'Billing action terms binding mismatch.';end if;
  update jovabook_private.billing_actions set commission_terms_version=p_payload->>'version',commission_terms_accepted_at=coalesce(commission_terms_accepted_at,clock_timestamp()),commission_terms=jsonb_build_object('version',p_payload->>'version','plan',p_payload->>'plan','base_amount_pence',case p_payload->>'plan' when 'essential' then 2000 when 'standard' then 5000 when 'premium' then 10000 end,'commission_bps',case p_payload->>'plan' when 'premium' then 0 else 100 end,'basis','full_service_price','recognition','appointment_instant','cycle','verified_subscription_period','cancelled_excluded',true,'no_show_excluded',true,'free_trial_excluded',true) where id=(p_payload->>'action')::uuid and salon_id=sid;
  update jovabook_private.billing_accounts set commission_terms_version=p_payload->>'version',commission_terms_accepted_at=case when commission_terms_version=p_payload->>'version' then coalesce(commission_terms_accepted_at,clock_timestamp()) else clock_timestamp() end where salon_id=sid;
  return jsonb_build_object('ok',true);
 end if;
 -- This path is strictly read-only. It never recognizes service, reserves a
 -- batch, creates an invoice item or claims that a payment has happened.
 if p_action='summary' then
  if not cfg.enabled or cfg.enabled_at is null then return jsonb_build_object('available',false,'currency','gbp');end if;
  if not exists(select 1 from jovabook_private.billing_accounts where salon_id=sid and commission_terms_version='2026-11-01-appointment-v1' and commission_terms_accepted_at is not null) then return jsonb_build_object('available',false,'currency','gbp');end if;
  select cs.summary into result from jovabook_private.commission_summaries cs where cs.salon_id=sid and cs.updated_at>clock_timestamp()-interval '24 hours';
  return coalesce(result,jsonb_build_object('available',false,'currency','gbp'))||jsonb_build_object('billing_ready',cfg.invoice_enabled);
 end if;
 if not cfg.enabled or cfg.enabled_at is null then return jsonb_build_object('disabled',true);end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 select * into account from jovabook_private.billing_accounts where salon_id=sid for update;
 if account.salon_id is null then return null;end if;
 if p_action='context' then
  return to_jsonb(account)||jsonb_build_object('invoice_enabled',cfg.invoice_enabled,'enabled_at',cfg.enabled_at,'review_required',exists(select 1 from jovabook_private.commission_entries where salon_id=sid and review_required),
   'batches',coalesce((select jsonb_agg(to_jsonb(cb)) from jovabook_private.commission_batches cb where cb.salon_id=sid and cb.status in('reserved','invoiced','needs_attention')),'[]'::jsonb),
   'credits',coalesce((select jsonb_agg(jsonb_build_object('entry',ce.id,'amount_minor',-ce.amount_minor,'original_batch',cb.id,'invoice_id',cb.invoice_id,'item_id',cb.provider_item_id,'batch_status',cb.status,'action',to_jsonb(cc)))
    from jovabook_private.commission_entries ce join jovabook_private.commission_entries service on service.salon_id=ce.salon_id and service.booking_id=ce.booking_id and service.service_at=ce.service_at and service.kind='service'
    join jovabook_private.commission_allocations alloc on alloc.entry_id=service.id and alloc.active join jovabook_private.commission_batches cb on cb.id=alloc.batch_id
    left join jovabook_private.commission_credit_actions cc on cc.entry_id=ce.id
    where ce.salon_id=sid and ce.kind='cancellation_credit' and (ce.status in('open','reserved') or cc.status in('issued','needs_attention'))),'[]'::jsonb));
 elsif p_action='history' then
  if account.deletion_state is not null or account.commission_terms_version is distinct from '2026-11-01-appointment-v1' then return null;end if;
  if account.customer_id is distinct from p_payload->>'customer' or account.subscription_id is distinct from p_payload->>'subscription' then raise exception 'Commission provider binding changed.';end if;
  if jsonb_typeof(p_payload->'history') is distinct from 'array' or jsonb_array_length(p_payload->'history')>1000 then raise exception 'Invalid provider history.';end if;
  for item in select value from jsonb_array_elements(p_payload->'history') loop
   if item->>'plan' not in('essential','standard','premium') or coalesce(item->>'invoice','')!~'^in_[A-Za-z0-9]+$' or coalesce(item->>'line','')!~'^il_[A-Za-z0-9_]+$' or (item->>'end')::timestamptz<=(item->>'start')::timestamptz then raise exception 'Invalid verified period.';end if;
   select * into existing from jovabook_private.commission_plan_history where salon_id=sid and invoice_id=item->>'invoice' and line_id=item->>'line';
   if existing.line_id is not null and (existing.plan,existing.effective_start,existing.period_end) is distinct from (item->>'plan',(item->>'start')::timestamptz,(item->>'end')::timestamptz) then raise exception 'A verified historical price period cannot be rewritten.';end if;
   insert into jovabook_private.commission_plan_history(salon_id,invoice_id,line_id,subscription_id,plan,effective_start,period_end)
   values(sid,item->>'invoice',item->>'line',item->>'subscription',item->>'plan',(item->>'start')::timestamptz,(item->>'end')::timestamptz) on conflict(salon_id,invoice_id,line_id) do nothing;
  end loop;
  insert into jovabook_private.commission_periods(salon_id,customer_id,subscription_id,period_start,period_end,next_plan,customer_credit_minor)
  values(sid,account.customer_id,account.subscription_id,(p_payload->>'period_start')::timestamptz,(p_payload->>'period_end')::timestamptz,p_payload->>'next_plan',coalesce((p_payload->>'customer_credit_minor')::bigint,0))
  on conflict(salon_id) do update set period_start=excluded.period_start,period_end=excluded.period_end,next_plan=excluded.next_plan,customer_credit_minor=excluded.customer_credit_minor,customer_id=excluded.customer_id,subscription_id=excluded.subscription_id,updated_at=now();
  perform jovabook_private.commission_accrue(sid);return jovabook_private.commission_refresh_summary(sid);
 elsif p_action='accrue' then
  if account.deletion_state is not null then return null;end if;
  perform jovabook_private.commission_accrue(sid);return jovabook_private.commission_refresh_summary(sid);
 elsif p_action='reserve' then
  if not cfg.invoice_enabled or account.deletion_state is not null or account.commission_terms_version is distinct from '2026-11-01-appointment-v1' then return null;end if;
  if exists(select 1 from jovabook_private.commission_entries where salon_id=sid and review_required) then raise exception 'Restored commission occurrence requires review.';end if;
  if account.customer_id is distinct from p_payload->>'customer' or account.subscription_id is distinct from p_payload->>'subscription' then raise exception 'Commission invoice binding changed.';end if;
  select * into batch from jovabook_private.commission_batches where invoice_id=p_payload->>'invoice';
  if batch.id is not null then if batch.salon_id<>sid then raise exception 'Commission invoice belongs to another business.';end if;return to_jsonb(batch);end if;
  perform jovabook_private.commission_accrue(sid);
  if exists(select 1 from jovabook_private.commission_entries where salon_id=sid and review_required) then raise exception 'Restored commission occurrence requires review.';end if;
  select sum(ce.amount_minor),count(*)::int,md5(string_agg(ce.id::text||':'||ce.amount_minor::text,',' order by ce.id)) into total,n,fingerprint
  from jovabook_private.commission_entries ce where ce.salon_id=sid and ce.kind='service' and ce.status='open' and ce.service_at<(p_payload->>'cutoff')::timestamptz;
  total:=coalesce(total,0);fingerprint:=coalesce(fingerprint,md5(''));
  if abs(total)>99999999 then raise exception 'Commission total needs invoice review.';end if;
  insert into jovabook_private.commission_batches(salon_id,invoice_id,customer_id,subscription_id,cutoff,amount_minor,entry_count,digest)
  values(sid,p_payload->>'invoice',account.customer_id,account.subscription_id,(p_payload->>'cutoff')::timestamptz,total,n,fingerprint) returning * into batch;
  insert into jovabook_private.commission_allocations(batch_id,entry_id) select batch.id,ce.id from jovabook_private.commission_entries ce where ce.salon_id=sid and ce.kind='service' and ce.status='open' and ce.service_at<batch.cutoff;
  update jovabook_private.commission_entries ce set status='reserved' where ce.id in(select ca.entry_id from jovabook_private.commission_allocations ca where ca.batch_id=batch.id);
  perform jovabook_private.commission_refresh_summary(sid);return to_jsonb(batch);
 elsif p_action in('bind_item','invoice_state') then
  select * into batch from jovabook_private.commission_batches where id=(p_payload->>'batch')::uuid and salon_id=sid for update;
  if batch.id is null or batch.customer_id is distinct from p_payload->>'customer' or batch.invoice_id is distinct from p_payload->>'invoice' then raise exception 'Commission batch binding mismatch.';end if;
  if p_action='bind_item' then
   if batch.amount_minor<>0 and coalesce(p_payload->>'item','')!~'^ii_[A-Za-z0-9]+$' or batch.provider_item_id is not null and batch.provider_item_id is distinct from p_payload->>'item' then raise exception 'Commission invoice item changed.';end if;
   if batch.status='paid' then return jsonb_build_object('ok',true);end if;
   if batch.status='void' then raise exception 'A voided commission batch cannot reopen.';end if;
   update jovabook_private.commission_batches set provider_item_id=p_payload->>'item',status='invoiced',updated_at=now() where id=batch.id;
   update jovabook_private.commission_entries ce set status='invoiced' where ce.id in(select ca.entry_id from jovabook_private.commission_allocations ca where ca.batch_id=batch.id and ca.active);
  elsif p_payload->>'status'='paid' then
   if batch.status not in('invoiced','paid') then raise exception 'Invoice item must be verified before collection.';end if;
   if coalesce(p_payload->>'settlement_kind','') not in('payment','customer_balance','credit_waiver') then raise exception 'Canonical collection coverage must be verified.';end if;
   update jovabook_private.commission_batches set status='paid',settlement_kind=p_payload->>'settlement_kind',updated_at=now() where id=batch.id;
   update jovabook_private.commission_entries ce set status='paid' where ce.id in(select ca.entry_id from jovabook_private.commission_allocations ca where ca.batch_id=batch.id and ca.active);
  elsif p_payload->>'status' in('void','absent_finalized') then
   if batch.status='paid' then raise exception 'A paid commission cannot be silently reopened.';end if;
   update jovabook_private.commission_batches set status='void',updated_at=now() where id=batch.id;
   update jovabook_private.commission_entries ce set status='open' where ce.id in(select ca.entry_id from jovabook_private.commission_allocations ca where ca.batch_id=batch.id and ca.active);
   update jovabook_private.commission_entries credit set status='void' where credit.salon_id=sid and credit.kind='cancellation_credit' and (credit.booking_id,credit.service_at) in(select service.booking_id,service.service_at from jovabook_private.commission_entries service join jovabook_private.commission_allocations alloc on alloc.entry_id=service.id where alloc.batch_id=batch.id and alloc.active);
   update jovabook_private.commission_allocations set active=false where batch_id=batch.id;
  elsif p_payload->>'status'='needs_attention' then update jovabook_private.commission_batches set status='needs_attention',updated_at=now() where id=batch.id;
  else raise exception 'Unknown commission invoice state.';end if;
  perform jovabook_private.commission_refresh_summary(sid);return jsonb_build_object('ok',true);
 elsif p_action='collection_begin' then
  if not cfg.invoice_enabled or account.deletion_state is not null or account.commission_terms_version is distinct from '2026-11-01-appointment-v1' then return null;end if;
  select * into batch from jovabook_private.commission_batches where id=(p_payload->>'batch')::uuid and salon_id=sid for update;
  if batch.id is null or batch.invoice_id is distinct from p_payload->>'invoice' or batch.customer_id is distinct from p_payload->>'customer' or batch.status<>'invoiced' then raise exception 'Commission collection binding mismatch.';end if;
  if p_payload->>'stage'='finalize' then update jovabook_private.commission_batches set finalize_started_at=coalesce(finalize_started_at,clock_timestamp()),collection_state='finalizing' where id=batch.id;
  elsif p_payload->>'stage'='pay' then update jovabook_private.commission_batches set pay_started_at=coalesce(pay_started_at,clock_timestamp()),collection_state='paying' where id=batch.id;
  else raise exception 'Unknown collection stage.';end if;
  return (select to_jsonb(cb) from jovabook_private.commission_batches cb where cb.id=batch.id);
 elsif p_action='collection_state' then
  if p_payload->>'state' not in('paid','failed','processing','unknown') then raise exception 'Unknown collection outcome.';end if;
  update jovabook_private.commission_batches set collection_state=p_payload->>'state',updated_at=clock_timestamp() where id=(p_payload->>'batch')::uuid and salon_id=sid and invoice_id=p_payload->>'invoice' and customer_id=p_payload->>'customer';
  return jsonb_build_object('ok',found);
 elsif p_action='credit_reserve' then
  if not cfg.invoice_enabled or account.deletion_state is not null then return null;end if;
  if not exists(select 1 from jovabook_private.commission_entries ce join jovabook_private.commission_entries service on service.salon_id=ce.salon_id and service.booking_id=ce.booking_id and service.service_at=ce.service_at and service.kind='service'
   join jovabook_private.commission_allocations alloc on alloc.entry_id=service.id and alloc.active join jovabook_private.commission_batches cb on cb.id=alloc.batch_id
   where ce.id=(p_payload->>'entry')::uuid and ce.salon_id=sid and ce.kind='cancellation_credit' and cb.id=(p_payload->>'batch')::uuid and cb.customer_id=p_payload->>'customer' and cb.invoice_id=p_payload->>'invoice' and cb.status in('invoiced','paid') and -ce.amount_minor=(p_payload->>'amount')::bigint) then raise exception 'Cancellation credit binding changed.';end if;
  insert into jovabook_private.commission_credit_actions(entry_id,batch_id,invoice_id,line_id,customer_id,amount_minor,credit_amount)
  values((p_payload->>'entry')::uuid,(p_payload->>'batch')::uuid,p_payload->>'invoice',p_payload->>'line',p_payload->>'customer',(p_payload->>'amount')::bigint,(p_payload->>'credit_amount')::bigint) on conflict(entry_id) do nothing;
  update jovabook_private.commission_entries set status='reserved' where id=(p_payload->>'entry')::uuid and status='open';
  return (select to_jsonb(cc) from jovabook_private.commission_credit_actions cc where cc.entry_id=(p_payload->>'entry')::uuid);
 elsif p_action='credit_finish' then
  if not exists(select 1 from jovabook_private.commission_credit_actions cc join jovabook_private.commission_entries ce on ce.id=cc.entry_id where cc.entry_id=(p_payload->>'entry')::uuid and ce.salon_id=sid and cc.invoice_id=p_payload->>'invoice' and cc.customer_id=p_payload->>'customer' and (cc.provider_id is null or cc.provider_id=p_payload->>'note')) or coalesce(p_payload->>'note','')!~'^cn_[A-Za-z0-9]+$' then raise exception 'Credit note binding changed.';end if;
  update jovabook_private.commission_credit_actions set provider_id=p_payload->>'note',status='issued' where entry_id=(p_payload->>'entry')::uuid;
  update jovabook_private.commission_entries set status='paid' where id=(p_payload->>'entry')::uuid;
  perform jovabook_private.commission_refresh_summary(sid);return jsonb_build_object('ok',true);
 elsif p_action='credit_attention' then
  update jovabook_private.commission_credit_actions cc set status='needs_attention' where cc.entry_id=(p_payload->>'entry')::uuid and exists(select 1 from jovabook_private.commission_entries ce where ce.id=cc.entry_id and ce.salon_id=sid);
  update jovabook_private.commission_entries set status='reserved' where id=(p_payload->>'entry')::uuid and salon_id=sid and kind='cancellation_credit';
  perform jovabook_private.commission_refresh_summary(sid);return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unknown commission worker action.';
end$$;
revoke all on function public.booking_commission_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_commission_worker(text,text,jsonb) to anon;
revoke all on function jovabook_private.commission_booking_event(),jovabook_private.commission_accrue(uuid),jovabook_private.commission_refresh_summary(uuid) from public,anon,authenticated;

-- A provider write with an unknown outcome must be reconciled before retention.
create or replace function jovabook_private.billing_customer_pending(p_salon uuid) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare pending boolean;begin
 if to_regclass('jovabook_private.customer_refunds') is not null then
  execute 'select exists(select 1 from jovabook_private.customer_refunds where salon_id=$1 and status<>''succeeded'')' into pending using p_salon;if pending then return true;end if;
 end if;
 if to_regclass('jovabook_private.customer_payment_actions') is not null then
  execute 'select exists(select 1 from jovabook_private.customer_payment_actions where salon_id=$1 and completed_at is null)' into pending using p_salon;if pending then return true;end if;
 end if;
 return exists(select 1 from jovabook_private.commission_batches where salon_id=p_salon and status in('reserved','needs_attention'))
 or exists(select 1 from jovabook_private.commission_batches where salon_id=p_salon and collection_state in('finalizing','paying','processing','unknown'))
 or exists(select 1 from jovabook_private.commission_entries where salon_id=p_salon and (review_required or status='needs_history'))
 or exists(select 1 from jovabook_private.commission_entries where salon_id=p_salon and kind='cancellation_credit' and status in('open','reserved'));
end$$;
revoke all on function jovabook_private.billing_customer_pending(uuid) from public,anon,authenticated;
create function jovabook_private.commission_retention_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into jovabook_private.commission_retention_audit(salon_id,paid_minor,unpaid_invoiced_minor,unbilled_minor,unresolved_occurrences,unresolved_full_price_minor)
 select old.id,coalesce(sum(amount_minor) filter(where status='paid'),0),coalesce(sum(amount_minor) filter(where status='invoiced'),0),coalesce(sum(amount_minor) filter(where status='open'),0),count(*) filter(where review_required or status='needs_history'),coalesce(sum(full_price_minor) filter(where review_required or status='needs_history'),0) from jovabook_private.commission_entries where salon_id=old.id on conflict do nothing;
 return old;
end$$;
create trigger commission_retention_snapshot before delete on public.salons for each row execute function jovabook_private.commission_retention_snapshot();
revoke all on function jovabook_private.commission_retention_snapshot() from public,anon,authenticated;
