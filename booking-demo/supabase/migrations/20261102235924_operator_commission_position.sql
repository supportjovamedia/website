begin;
-- Read-only positions. Viewing a business never creates a fee or an invoice.
create function jovabook_private.operator_commission_position(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a jovabook_private.billing_accounts;cfg jovabook_private.commission_config;
 ledger bigint;uninvoiced bigint;missing_due bigint;pending bigint;unknown_due integer;begin
 select * into a from jovabook_private.billing_accounts where salon_id=p_id;
 select * into cfg from jovabook_private.commission_config where singleton;
 select coalesce(sum(amount_minor),0) into uninvoiced from jovabook_private.commission_entries
 where salon_id=p_id and status in('open','reserved') and not review_required and service_at<=now();
 select coalesce(sum(greatest(0,b.amount_minor-coalesce((select sum(c.amount_minor) from jovabook_private.commission_credit_actions c where c.batch_id=b.id and c.status='issued'),0))),0)
 into ledger from jovabook_private.commission_batches b where b.salon_id=p_id and b.status='invoiced';
 with eligible as (
  select o.*,h.plan verified_plan,
   coalesce(h.plan,case when a.pending_target is not null and a.pending_effective_at<=o.current_start then a.pending_target else a.paid_plan end) projected_plan,
   exists(select 1 from jovabook_private.commission_entries e where e.salon_id=o.salon_id and e.booking_id=o.booking_id and e.kind='service' and e.status<>'needs_history') recorded,
   exists(select 1 from public.bookings b where b.salon_id=o.salon_id and b.id=o.booking_id and b.status in('confirmed','completed')) future_bookable
  from jovabook_private.commission_origins o
  left join lateral(select ph.plan from jovabook_private.commission_plan_history ph where ph.salon_id=p_id and ph.effective_start<=o.current_start and ph.period_end>o.current_start order by ph.effective_start desc,ph.verified_at desc limit 1) h on true
  where o.salon_id=p_id and o.source='Online' and o.booking_id=o.root_booking_id and o.decision in('pending','chargeable')
   and cfg.enabled and cfg.enabled_at is not null and a.deletion_state is null and a.commission_terms_accepted_at is not null
   and o.terms_version='2026-11-02-online-origin-v3' and o.booked_at>=greatest(cfg.enabled_at,a.commission_terms_accepted_at)
   and not coalesce(o.current_start>=a.trial_started_at and o.current_start<a.trial_ends_at,false)
 )
 select coalesce(sum(case when verified_plan='premium' then 0 else (original_price_minor*100+5000)/10000 end) filter(where current_start<=now() and not recorded and verified_plan is not null),0),
  coalesce(sum(case when projected_plan='premium' then 0 else (original_price_minor*100+5000)/10000 end) filter(where current_start>now() and future_bookable and (a.ever_paid or a.card_trial_required and a.trial_payment_method is not null)),0),
  count(*) filter(where current_start<=now() and not recorded and verified_plan is null)
 into missing_due,pending,unknown_due from eligible;
 return jsonb_build_object('due_minor',case when unknown_due=0 then greatest(0,ledger+uninvoiced+missing_due) end,
  'pending_minor',pending,'due_needs_history',unknown_due>0,'pending_estimate',true);
end$$;
revoke all on function jovabook_private.operator_commission_position(uuid) from public,anon,authenticated;

alter function jovabook_private.operator_billing_record(uuid,boolean) rename to operator_billing_record_before_position;
create function jovabook_private.operator_billing_record(p_id uuid,p_batches boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare data jsonb;begin
 data:=jovabook_private.operator_billing_record_before_position(p_id,p_batches);
 return jsonb_set(data,'{commission}',(data->'commission')||jovabook_private.operator_commission_position(p_id));
end$$;
revoke all on function jovabook_private.operator_billing_record(uuid,boolean),jovabook_private.operator_billing_record_before_position(uuid,boolean) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
