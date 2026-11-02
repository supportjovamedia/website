begin;

-- All helpers below only SELECT existing records. Dashboard reads never accrue,
-- refresh, reserve, collect, settle or change an owner's subscription.
create function jovabook_private.operator_billing_record(p_id uuid,p_batches boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare account jovabook_private.billing_accounts;period jovabook_private.commission_periods;
 cached jovabook_private.commission_summaries;cfg jovabook_private.commission_config;
 known boolean;unresolved bigint;settled bigint;gross bigint;debt bigint;unbilled bigint;credits bigint;
 rows jsonb:='[]';estimate jsonb;fresh boolean;estimate_ok boolean;recorded_at timestamptz;
begin
 select * into account from jovabook_private.billing_accounts where salon_id=p_id;
 select * into period from jovabook_private.commission_periods where salon_id=p_id;
 select * into cached from jovabook_private.commission_summaries where salon_id=p_id;
 select * into cfg from jovabook_private.commission_config where singleton;
 known:=period.salon_id is not null or exists(select 1 from jovabook_private.commission_entries where salon_id=p_id)
  or exists(select 1 from jovabook_private.commission_batches where salon_id=p_id);
 select count(*) filter(where review_required or status='needs_history' or kind='cancellation_credit' and status in('open','reserved')),
  coalesce(sum(amount_minor) filter(where status='open'),0),max(created_at)
 into unresolved,unbilled,recorded_at from jovabook_private.commission_entries where salon_id=p_id;
 unresolved:=unresolved+(select count(*) from jovabook_private.commission_batches where salon_id=p_id and status='needs_attention')
  +(select count(*) from jovabook_private.commission_invoice_cycles c where c.salon_id=p_id and (c.invoice_id is null or not exists(select 1 from jovabook_private.commission_batches b where b.invoice_id=c.invoice_id)));
 select coalesce(sum(amount_minor) filter(where status='paid'),0),
  coalesce(sum(greatest(0,amount_minor-issued)) filter(where status='paid'),0),
  coalesce(sum(greatest(0,amount_minor-issued)) filter(where status='invoiced'),0),
  coalesce(sum(issued),0),greatest(recorded_at,max(updated_at))
 into gross,settled,debt,credits,recorded_at from (
  select b.amount_minor,b.status,b.updated_at,coalesce((select sum(c.amount_minor) from jovabook_private.commission_credit_actions c where c.batch_id=b.id and c.status='issued'),0) issued
  from jovabook_private.commission_batches b where b.salon_id=p_id
 ) batches;
 recorded_at:=greatest(recorded_at,period.updated_at,cached.updated_at);
 fresh:=cached.salon_id is not null and cached.updated_at>now()-interval '24 hours';
 estimate_ok:=fresh and coalesce(cfg.enabled,false) and cfg.enabled_at is not null
  and jovabook_private.commission_terms_current(account.commission_terms_version)
  and account.commission_terms_accepted_at is not null and coalesce((cached.summary->>'available')::boolean,false)
  and unresolved=0 and not exists(select 1 from jovabook_private.commission_batches where salon_id=p_id and status='reserved');
 estimate:=jsonb_build_object('available',estimate_ok,'stale',not fresh,'updated_at',cached.updated_at,
  'period_start',period.period_start,'period_end',period.period_end,'cadence',period.cadence,'commission_cadence','monthly',
  'subscription_due_at',coalesce(period.subscription_period_end,period.period_end),
  'subscription_next_cadence',period.next_cadence,
  'subscription_amount_pence',case when estimate_ok then cached.summary->'subscription_amount_pence' end,
  'new_commission_pence',case when estimate_ok then cached.summary->'new_commission_pence' end,
  'carry_forward_pence',case when estimate_ok then cached.summary->'carry_forward_pence' end,
  'customer_credit_pence',case when estimate_ok then cached.summary->'customer_credit_pence' end,
  'estimated_total_pence',case when estimate_ok then cached.summary->'estimated_total_pence' end,
  'unpaid_invoiced_pence',case when estimate_ok then cached.summary->'unpaid_invoiced_pence' end);
 if p_batches then
  select coalesce(jsonb_agg(item order by created_at desc),'[]') into rows from (
   select b.created_at,jsonb_build_object(
    'reference','commission_'||encode(sha256(convert_to(b.id::text,'UTF8')),'hex'),
    'invoice_reference','invoice_'||encode(sha256(convert_to(b.invoice_id,'UTF8')),'hex'),
    'cutoff',b.cutoff,'amount_minor',b.amount_minor,
    'issued_credits_minor',coalesce((select sum(c.amount_minor) from jovabook_private.commission_credit_actions c where c.batch_id=b.id and c.status='issued'),0),
    'local_status',b.status,'collection_state',b.collection_state,'settlement_kind',b.settlement_kind,
    'recorded_at',b.updated_at) item
   from jovabook_private.commission_batches b where b.salon_id=p_id order by b.created_at desc,b.id limit 20
  ) limited;
 end if;
 return jsonb_build_object('currency','gbp',
  'subscription',jsonb_build_object('ever_paid',coalesce(account.ever_paid,false),'plan',account.paid_plan,
   'cadence',account.paid_cadence,'paid_until',account.paid_until,'provider_status',account.provider_status,
   'failed_at',account.failed_at,'last_verified_at',account.last_verified_at,
   'cancel_at_period_end',coalesce(account.cancel_at_period_end,false),'pending_plan',account.pending_target,
   'pending_cadence',account.pending_cadence,'pending_effective_at',account.pending_effective_at),
  'commission',jsonb_build_object('recorded',true,'tracking_enabled',coalesce(cfg.enabled,false),
   'available',known and unresolved=0,'settled_minor',case when known then settled end,
   'settled_gross_minor',case when known then gross end,'invoiced_outstanding_minor',case when known then debt end,
   'unbilled_minor',case when known and unresolved=0 then unbilled end,
   'issued_credits_minor',case when known then credits end,'unresolved_count',unresolved,
   'review_required',unresolved>0,'cash_collected_minor',null,'cash_collected_available',false,
   'updated_at',recorded_at,'period_start',period.period_start,'period_end',period.period_end),
  'estimate',estimate,'batches',rows);
end$$;

create function jovabook_private.operator_business_record(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'created_at',s.created_at,'status',s.status,
  'account_email',u.email,'business_email',case when lower(trim(s.email)) is distinct from lower(trim(u.email)) then s.email end,
  'has_paid',coalesce(a.ever_paid,false),'billing_state',case
   when not coalesce(a.ever_paid,false) then case when a.trial_started_at is null then 'payment_required' when a.trial_ends_at>now() then 'trial' else 'trial_ended' end
   when a.provider_status='canceled' and coalesce(a.paid_until,now())<=now() then 'cancelled'
   when a.failed_at is not null or coalesce(a.paid_until,now())<=now() then 'past_due' else 'paid' end,
  'plan',case when a.ever_paid then a.paid_plan else 'essential' end,'access',jovabook_private.billing_access(s.id),
  'trial_end',a.trial_ends_at,'paid_until',a.paid_until,'cadence',a.paid_cadence,'cancel_at_period_end',a.cancel_at_period_end,
  'commission',billing->'commission','estimate',billing->'estimate')
 from public.salons s join auth.users u on u.id=s.owner_id
 left join jovabook_private.billing_accounts a on a.salon_id=s.id
 cross join lateral jovabook_private.operator_billing_record(s.id,false) billing where s.id=p_id
$$;

create function public.operator_billing_summary(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform jovabook_private.require_operator();
 if not exists(select 1 from public.salons where id=p_id) then raise exception 'Business not found.' using errcode='P0002';end if;
 return jsonb_build_object('ok',true)||jovabook_private.operator_billing_record(p_id,true);
end$$;

-- Preserve the existing recent-history, notification and sign-in contracts.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.operator_overview()'::regprocedure);
 execute replace(definition,'public.operator_overview(','jovabook_private.operator_overview_before_billing(');
end$$;
create or replace function public.operator_overview() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;counts jsonb;commission jsonb;
begin
 perform jovabook_private.require_operator();result:=jovabook_private.operator_overview_before_billing();
 select jsonb_build_object('essential',count(*) filter(where a.ever_paid and a.paid_plan='essential'),
  'standard',count(*) filter(where a.ever_paid and a.paid_plan='standard'),'premium',count(*) filter(where a.ever_paid and a.paid_plan='premium'),
  'paid_total',count(*) filter(where a.ever_paid),'paid_active',count(*) filter(where a.ever_paid and a.failed_at is null and a.paid_until>now()),
  'trials_total',count(*) filter(where not a.ever_paid and a.trial_started_at is not null),
  'trials_active',count(*) filter(where not a.ever_paid and a.trial_started_at is not null and a.trial_ends_at>now()),
  'trials_ended',count(*) filter(where not a.ever_paid and a.trial_started_at is not null and (a.trial_ends_at is null or a.trial_ends_at<=now())))
 into counts from public.salons s left join jovabook_private.billing_accounts a on a.salon_id=s.id;
 select jsonb_build_object('recorded',true,'currency','gbp',
  'settled_minor',sum((billing->'commission'->>'settled_minor')::bigint),
  'invoiced_outstanding_minor',sum((billing->'commission'->>'invoiced_outstanding_minor')::bigint),
  'unbilled_minor',case when coalesce(sum((billing->'commission'->>'unresolved_count')::bigint),0)=0 then sum((billing->'commission'->>'unbilled_minor')::bigint) end,
  'unresolved_count',coalesce(sum((billing->'commission'->>'unresolved_count')::bigint),0),
  'businesses_available',count(*) filter(where (billing->'commission'->>'available')::boolean),
  'businesses_unavailable',count(*) filter(where not (billing->'commission'->>'available')::boolean))
 into commission from public.salons s cross join lateral jovabook_private.operator_billing_record(s.id,false) billing;
 return result||counts||jsonb_build_object('commission',commission);
end$$;

create or replace function public.operator_businesses(p_search text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform jovabook_private.require_operator();
 select coalesce(jsonb_agg(item order by created_at desc),'[]') into result from (
  select s.created_at,jovabook_private.operator_business_record(s.id) item
  from public.salons s join auth.users u on u.id=s.owner_id
  where length(coalesce(p_search,''))<=100 and (coalesce(p_search,'')='' or
   position(lower(trim(p_search)) in lower(s.name||' '||s.slug||' '||coalesce(u.email,'')||' '||coalesce(s.email,'')))>0)
  order by s.created_at desc,s.id limit 200
 ) businesses;
 insert into jovabook_private.operator_audit(actor_id,action) values(auth.uid(),'business_directory');
 return jsonb_build_object('ok',true,'businesses',result,'total',(select count(*) from public.salons));
end$$;

create or replace function public.operator_business(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform jovabook_private.require_operator();
 result:=jovabook_private.operator_business_before_privacy(p_id);
 result:=jsonb_set(result,'{business}',(result->'business')-'owner'-'email'-'phone'||jovabook_private.operator_business_record(p_id));
 return result||jsonb_build_object('billing_summary',jsonb_build_object('ok',true)||jovabook_private.operator_billing_record(p_id,true));
end$$;

revoke all on function jovabook_private.operator_billing_record(uuid,boolean),jovabook_private.operator_business_record(uuid),jovabook_private.operator_overview_before_billing() from public,anon,authenticated;
revoke all on function public.operator_billing_summary(uuid),public.operator_overview(),public.operator_businesses(text),public.operator_business(uuid) from public,anon,authenticated;
grant execute on function public.operator_billing_summary(uuid),public.operator_overview(),public.operator_businesses(text),public.operator_business(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
