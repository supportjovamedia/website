-- Forward-only online-origin policy. Existing invoices and legacy occurrences remain unchanged.
begin;
-- Abort safely if the installed function foundation differs from the reviewed version.
create function jovabook_private.commission_replace_required(p_source text,p_old text,p_new text) returns text language plpgsql set search_path='' as $checked$
begin if strpos(p_source,p_old)=0 then raise exception 'Commission migration foundation differs: %',left(p_old,100);end if;return replace(p_source,p_old,p_new);end$checked$;
revoke all on function jovabook_private.commission_replace_required(text,text,text) from public,anon,authenticated;

create table jovabook_private.commission_origins(
 salon_id uuid not null references public.salons(id) on delete cascade,booking_id text not null,
 source text not null check(source in('Online','Manual','Unknown')),original_price_minor bigint not null check(original_price_minor>=0),
 booked_at timestamptz not null default clock_timestamp(),original_start timestamptz not null,current_start timestamptz not null,
 terms_version text,root_booking_id text not null,decision text not null default 'pending' check(decision in('pending','review','waived','chargeable','credited')),
 primary key(salon_id,booking_id));
create table jovabook_private.commission_reviews(
 id bigserial primary key,salon_id uuid not null references public.salons(id) on delete cascade,booking_id text not null,
 actor uuid,action text not null,reason text not null default '',created_at timestamptz not null default clock_timestamp(),evidence jsonb not null default '{}');
alter table jovabook_private.commission_origins enable row level security;
alter table jovabook_private.commission_reviews enable row level security;
revoke all on jovabook_private.commission_origins,jovabook_private.commission_reviews from public,anon,authenticated;
revoke all on sequence jovabook_private.commission_reviews_id_seq from public,anon,authenticated;

create function jovabook_private.commission_origin_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare o jovabook_private.commission_origins;v_source text;begin
 if tg_op='INSERT' then
  if new.status='no-show' and jovabook_private.sms_start(new)>clock_timestamp() then raise exception 'No-show can only be reported after the appointment starts.';end if;
  -- Authenticated owner entry is manual. Public booking functions insert Online.
  v_source:=case when current_setting('jovabook.online_booking',true)='trusted' then 'Online' when exists(select 1 from public.salons where id=new.salon_id and owner_id=auth.uid()) then 'Manual' else 'Unknown' end;
  new.source:=case when v_source='Online' then 'Online' else 'Manual' end;
  insert into jovabook_private.commission_origins(salon_id,booking_id,source,original_price_minor,original_start,current_start,root_booking_id,terms_version,decision)
  values(new.salon_id,new.id,v_source,round(new.price*100)::bigint,jovabook_private.sms_start(new),jovabook_private.sms_start(new),new.id,(select commission_terms_version from jovabook_private.billing_accounts where salon_id=new.salon_id),case when new.status in('cancelled','no-show') then 'review' else 'pending' end);
  if new.status in('cancelled','no-show') then
   insert into jovabook_private.commission_reviews(salon_id,booking_id,actor,action,evidence) values(new.salon_id,new.id,auth.uid(),new.status,jsonb_build_object('actor_kind',case when exists(select 1 from public.salons where id=new.salon_id and owner_id=auth.uid()) then 'staff' else 'unverified_link_or_server' end,'scheduled_start',jovabook_private.sms_start(new)));
  end if;
  return new;
 end if;
 select * into o from jovabook_private.commission_origins where salon_id=old.salon_id and booking_id=old.id for update;
 if tg_op='UPDATE' then
  if (new.id,new.salon_id) is distinct from (old.id,old.salon_id) then raise exception 'Booking reference cannot change.';end if;
  if new.source is distinct from old.source then raise exception 'Original booking source cannot change.';end if;
  if new.status='no-show' and old.status is distinct from new.status and jovabook_private.sms_start(old)>clock_timestamp() then raise exception 'No-show can only be reported after the appointment starts.';end if;
  if o.booking_id is null then return new;end if;
  if new.price is distinct from old.price then insert into jovabook_private.commission_reviews(salon_id,booking_id,actor,action,evidence) values(old.salon_id,old.id,auth.uid(),'price_edit',jsonb_build_object('original_price_minor',o.original_price_minor,'new_price_minor',round(new.price*100)));end if;
  update jovabook_private.commission_origins set current_start=jovabook_private.sms_start(new) where salon_id=old.salon_id and booking_id in(old.id,o.root_booking_id);
  if jovabook_private.sms_start(new)>clock_timestamp() and (new.date,new.time) is distinct from (old.date,old.time) then
   update jovabook_private.commission_entries set review_required=true where salon_id=o.salon_id and booking_id=o.root_booking_id and kind='service' and status in('reserved','invoiced','paid');
  end if;
 end if;
 if o.booking_id is not null and (tg_op='DELETE' or new.status in('cancelled','no-show') and new.status is distinct from old.status) then
  update jovabook_private.commission_origins set decision='review' where salon_id=o.salon_id and booking_id=o.root_booking_id and source='Online';
  update jovabook_private.commission_entries set review_required=true where salon_id=o.salon_id and booking_id=o.root_booking_id and kind='service' and status in('open','needs_history','reserved','invoiced','paid');
  insert into jovabook_private.commission_reviews(salon_id,booking_id,actor,action,evidence) values(old.salon_id,old.id,auth.uid(),case when tg_op='DELETE' then 'deleted' else new.status end,jsonb_build_object('actor_kind',case when exists(select 1 from public.salons where id=old.salon_id and owner_id=auth.uid()) then 'staff' when exists(select 1 from auth.users u join public.customer_portal_memberships m on m.user_id=u.id and m.salon_id=old.salon_id where u.id=auth.uid() and u.email_confirmed_at is not null and lower(trim(u.email))=lower(trim(old.email))) then 'verified_customer' else 'unverified_link_or_server' end,'scheduled_start',o.current_start));
 end if;
 return coalesce(new,old);
end$$;
create trigger commission_origin_guard before insert or update or delete on public.bookings for each row execute function jovabook_private.commission_origin_guard();
revoke all on function jovabook_private.commission_origin_guard() from public,anon,authenticated;

-- Keep the verified legacy accrual path, excluding newly snapshotted bookings.
do $$declare s text;begin
 s:=pg_get_functiondef('jovabook_private.commission_accrue(uuid)'::regprocedure);
 s:=jovabook_private.commission_replace_required(s,'jovabook_private.commission_accrue(','jovabook_private.commission_accrue_legacy(');
 s:=jovabook_private.commission_replace_required(s,'where e.salon_id=p_salon','where e.salon_id=p_salon and not exists(select 1 from jovabook_private.commission_origins origin where origin.salon_id=e.salon_id and origin.booking_id=e.booking_id)');
 execute s;
end$$;
revoke all on function jovabook_private.commission_accrue_legacy(uuid) from public,anon,authenticated;
create or replace function jovabook_private.commission_accrue(p_salon uuid) returns void language plpgsql security definer set search_path='' as $$
declare a jovabook_private.billing_accounts;cfg jovabook_private.commission_config;o record;e jovabook_private.commission_entries;h jovabook_private.commission_plan_history;bps integer;begin
 perform jovabook_private.commission_accrue_legacy(p_salon);
 select * into a from jovabook_private.billing_accounts where salon_id=p_salon;
 select * into cfg from jovabook_private.commission_config where singleton;
 if not cfg.enabled or cfg.enabled_at is null or a.deletion_state is not null or a.commission_terms_accepted_at is null then return;end if;
 for o in select * from jovabook_private.commission_origins where salon_id=p_salon and booking_id=root_booking_id and terms_version='2026-11-02-online-origin-v3' and source='Online' and booked_at>=greatest(cfg.enabled_at,a.commission_terms_accepted_at) loop
  select * into e from jovabook_private.commission_entries where salon_id=p_salon and booking_id=o.booking_id and kind='service' order by created_at limit 1 for update;
  if o.decision in('review','waived','credited') then
   if e.id is not null and o.decision='review' then update jovabook_private.commission_entries set review_required=true where id=e.id;
   elsif e.id is not null and e.status in('open','needs_history') then update jovabook_private.commission_entries set status='void',review_required=false where id=e.id;
   elsif e.id is not null and e.status in('reserved','invoiced','paid') and e.amount_minor>0 then
    insert into jovabook_private.commission_entries(salon_id,booking_id,kind,service_at,full_price_minor,rate_bps,amount_minor,history_invoice,history_line,status)
    values(p_salon,e.booking_id,'cancellation_credit',e.service_at,e.full_price_minor,e.rate_bps,-e.amount_minor,e.history_invoice,e.history_line,'open') on conflict(salon_id,booking_id,kind,service_at) do nothing;
    update jovabook_private.commission_entries set review_required=false where id=e.id;
   end if;
   continue;
  end if;
  if o.current_start>clock_timestamp() then
   if e.id is not null and e.status in('open','needs_history') then
    update jovabook_private.commission_entries set service_at=o.current_start,status='needs_history',rate_bps=null,amount_minor=null,history_invoice=null,history_line=null,review_required=false where id=e.id;
   elsif e.id is not null and e.status in('reserved','invoiced','paid') then update jovabook_private.commission_entries set review_required=true where id=e.id;end if;
   continue;
  end if;
  if e.id is not null then update jovabook_private.commission_entries set review_required=false where id=e.id;end if;
  select * into h from jovabook_private.commission_plan_history where salon_id=p_salon and effective_start<=o.current_start and period_end>o.current_start order by effective_start desc,verified_at desc limit 1;
  bps:=case when h.plan='premium' then 0 else 100 end;
  if e.id is null then
   insert into jovabook_private.commission_entries(salon_id,booking_id,kind,service_at,full_price_minor,rate_bps,amount_minor,history_invoice,history_line,status)
   values(p_salon,o.booking_id,'service',o.current_start,o.original_price_minor,case when h.plan is not null then bps end,case when h.plan is not null then (o.original_price_minor*bps+5000)/10000 end,h.invoice_id,h.line_id,
    case when o.current_start>=a.trial_started_at and o.current_start<a.trial_ends_at then 'waived_trial' when h.plan is null then 'needs_history' else 'open' end);
  elsif e.status='needs_history' or e.status='open' and e.service_at is distinct from o.current_start then
   update jovabook_private.commission_entries set service_at=o.current_start,rate_bps=case when h.plan is not null then bps end,amount_minor=case when h.plan is not null then (e.full_price_minor*bps+5000)/10000 end,history_invoice=h.invoice_id,history_line=h.line_id,
    status=case when o.current_start>=a.trial_started_at and o.current_start<a.trial_ends_at then 'waived_trial' when h.plan is null then 'needs_history' else 'open' end where id=e.id;
  end if;
 end loop;
end$$;

-- Add consent without rewriting settled receipts. Preserve all existing worker wrappers.
create or replace function jovabook_private.commission_terms_current(p_version text) returns boolean language sql immutable set search_path='' as $$select coalesce(p_version in('2026-11-01-appointment-v1','2026-11-01-annual-monthly-v2','2026-11-02-online-origin-v3'),false)$$;
do $$declare s text;begin
 s:=pg_get_functiondef('public.booking_commission_worker(text,text,jsonb)'::regprocedure);
 execute jovabook_private.commission_replace_required(s,'public.booking_commission_worker(','jovabook_private.commission_worker_before_origin(');
 -- Annual collection recognises explicit new consent as well as historical consent.
 s:=pg_get_functiondef('jovabook_private.commission_worker_before_supervisor(text,text,jsonb)'::regprocedure);
 s:=jovabook_private.commission_replace_required(s,'account.commission_terms_version is distinct from ''2026-11-01-annual-monthly-v2''','account.commission_terms_version not in(''2026-11-01-annual-monthly-v2'',''2026-11-02-online-origin-v3'')');execute s;
end$$;
revoke all on function jovabook_private.commission_worker_before_origin(text,text,jsonb) from public,anon,authenticated;
create or replace function public.booking_commission_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg jovabook_private.commission_config;sid uuid;o jovabook_private.commission_origins;r jovabook_private.commission_origins;begin
 if p_action not in('origin_review','origin_link','accept_terms') or p_action='accept_terms' and p_payload->>'version' is distinct from '2026-11-02-online-origin-v3' then return jovabook_private.commission_worker_before_origin(p_token,p_action,p_payload);end if;
 select * into cfg from jovabook_private.commission_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or cfg.worker_hash is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>cfg.worker_hash then raise exception 'Invalid commission worker.' using errcode='42501';end if;
 sid:=(p_payload->>'salon')::uuid;perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 if p_action='accept_terms' then
  if not exists(select 1 from jovabook_private.billing_actions where salon_id=sid and id=(p_payload->>'action')::uuid and target=p_payload->>'plan' and cadence=coalesce(p_payload->>'cadence','monthly') and kind in('checkout','upgrade','downgrade','schedule')) then raise exception 'Billing terms binding changed.';end if;
  update jovabook_private.billing_actions set commission_terms_version=p_payload->>'version',commission_terms_accepted_at=clock_timestamp(),commission_terms=jsonb_build_object('version',p_payload->>'version','basis','original_customer_confirmed_online_price','manual_free',true,'commission_bps',case when p_payload->>'plan'='premium' then 0 else 100 end,'cycle','monthly','cancellation','explicit_review_and_credit') where salon_id=sid and id=(p_payload->>'action')::uuid;
  update jovabook_private.billing_accounts set commission_terms_version=p_payload->>'version',commission_terms_accepted_at=case when commission_terms_version=p_payload->>'version' then coalesce(commission_terms_accepted_at,clock_timestamp()) else clock_timestamp() end where salon_id=sid and deletion_state is null;
  return jsonb_build_object('ok',found);
 end if;
 if length(trim(coalesce(p_payload->>'reason','')))<3 then raise exception 'An audited reason is required.';end if;
 select * into o from jovabook_private.commission_origins where salon_id=sid and booking_id=p_payload->>'booking' for update;
 if o.booking_id is null or o.source<>'Online' or o.booking_id<>o.root_booking_id then raise exception 'Original online booking is required.';end if;
 if p_action='origin_link' then
  select * into r from jovabook_private.commission_origins where salon_id=sid and booking_id=p_payload->>'replacement' for update;
  if r.booking_id is null or r.source<>'Manual' or r.root_booking_id<>r.booking_id or exists(select 1 from jovabook_private.commission_entries where salon_id=sid and booking_id=r.booking_id) then raise exception 'Unbilled manual replacement is required.';end if;
  if exists(select 1 from jovabook_private.commission_entries where salon_id=sid and booking_id=o.booking_id and kind='cancellation_credit') then raise exception 'Credited booking needs separate financial review.';end if;
  update jovabook_private.commission_origins set root_booking_id=o.booking_id where salon_id=sid and booking_id=r.booking_id;
  update jovabook_private.commission_origins set current_start=r.current_start,decision='chargeable' where salon_id=sid and booking_id=o.booking_id;
 else
  if coalesce(p_payload->>'decision','') not in('waived','chargeable') then raise exception 'Review must explicitly waive or confirm the fee.';end if;
  if p_payload->>'decision'='chargeable' and exists(select 1 from jovabook_private.commission_entries where salon_id=sid and booking_id=o.booking_id and (status='void' or kind='cancellation_credit')) then raise exception 'Reinstatement needs separate financial review.';end if;
  update jovabook_private.commission_origins set decision=p_payload->>'decision' where salon_id=sid and booking_id=o.booking_id;
 end if;
 insert into jovabook_private.commission_reviews(salon_id,booking_id,actor,action,reason,evidence) values(sid,o.booking_id,(p_payload->>'actor')::uuid,p_action,p_payload->>'reason',p_payload-'salon'-'actor');
 update jovabook_private.commission_entries set review_required=false where salon_id=sid and booking_id=o.booking_id and kind='service';
 perform jovabook_private.commission_accrue(sid);perform jovabook_private.commission_refresh_summary(sid);
 return jsonb_build_object('ok',true);
end$$;
-- Shared trusted implementation for operator RPCs. Never granted to browser roles.
do $$declare s text;begin
 s:=pg_get_functiondef('public.booking_commission_worker(text,text,jsonb)'::regprocedure);
 s:=jovabook_private.commission_replace_required(s,'public.booking_commission_worker(p_token text, p_action text, p_payload jsonb DEFAULT ''{}''::jsonb)','jovabook_private.commission_origin_action(p_action text, p_payload jsonb)');
 s:=jovabook_private.commission_replace_required(s,'if p_action not in(''origin_review'',''origin_link'',''accept_terms'') or p_action=''accept_terms'' and p_payload->>''version'' is distinct from ''2026-11-02-online-origin-v3'' then return jovabook_private.commission_worker_before_origin(p_token,p_action,p_payload);end if;','if p_action not in(''origin_review'',''origin_link'') then raise exception ''Invalid origin action.'';end if;');
 s:=jovabook_private.commission_replace_required(s,'if coalesce(p_token,'''')!~''^[0-9a-f]{64}$'' or cfg.worker_hash is null or encode(sha256(convert_to(p_token,''UTF8'')),''hex'')<>cfg.worker_hash then raise exception ''Invalid commission worker.'' using errcode=''42501'';end if;','');
 if strpos(s,'p_token')>0 then raise exception 'Unexpected origin action foundation.';end if;
 execute s;
end$$;
revoke all on function jovabook_private.commission_origin_action(text,jsonb) from public,anon,authenticated;
-- Reuse the committed-booking email outbox and its retry/recipient safeguards.
alter table jovabook_private.email_queue drop constraint email_queue_kind_check;
alter table jovabook_private.email_queue add constraint email_queue_kind_check check(kind in('confirmed','rescheduled','cancelled','reminder','no-show'));
do $$declare s text;begin
 s:=pg_get_functiondef('jovabook_private.enqueue_booking_email(public.bookings,text,timestamp with time zone)'::regprocedure);
 s:=jovabook_private.commission_replace_required(s,'when ''cancelled'' then ''Booking cancelled''','when ''cancelled'' then ''Booking cancelled'' when ''no-show'' then ''Appointment reported as no-show''');execute s;
 s:=pg_get_functiondef('jovabook_private.booking_email_event()'::regprocedure);
 s:=jovabook_private.commission_replace_required(s,'elsif new.status=''confirmed'' then event_kind:=','elsif new.status=''no-show'' and (TG_OP=''INSERT'' or old.status is distinct from new.status) then event_kind:=''no-show''; elsif new.status=''confirmed'' then event_kind:=');execute s;
 s:=pg_get_functiondef('public.booking_email_worker(text,text,jsonb)'::regprocedure);
 s:=jovabook_private.commission_replace_required(s,'(q.kind<>''cancelled'' and','(q.kind not in(''cancelled'',''no-show'') and');
 s:=jovabook_private.commission_replace_required(s,'or (q.kind=''reminder'' and','or (q.kind=''no-show'' and (b.id is null or b.status<>''no-show'')) or (q.kind=''reminder'' and');execute s;
end$$;

-- Only canonical server booking paths mark online origin, including owners using the public journey.
do $$declare s text;begin
 s:=pg_get_functiondef('public.create_booking(text,text,text,text,text,text,text,text,text,text)'::regprocedure);
 execute jovabook_private.commission_replace_required(s,'public.create_booking(','jovabook_private.create_booking_before_origin(');
end$$;
revoke all on function jovabook_private.create_booking_before_origin(text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
create or replace function public.create_booking(p_slug text,p_service text,p_staff text,p_date text,p_time text,p_name text,p_email text,p_phone text,p_notes text,p_method text default 'Card') returns jsonb language plpgsql security definer set search_path='' as $$
declare previous text:=coalesce(current_setting('jovabook.online_booking',true),'');result jsonb;begin
 perform set_config('jovabook.online_booking','trusted',true);
 result:=jovabook_private.create_booking_before_origin(p_slug,p_service,p_staff,p_date,p_time,p_name,p_email,p_phone,p_notes,p_method);
 perform set_config('jovabook.online_booking',previous,true);return result;
exception when others then perform set_config('jovabook.online_booking',previous,true);raise;
end$$;
-- Deposits become bookings only in the token-authenticated payment worker.
do $$declare s text;begin
 if to_regprocedure('public.booking_deposit_worker(text,text,jsonb)') is not null then
 s:=pg_get_functiondef('public.booking_deposit_worker(text,text,jsonb)'::regprocedure);
 execute jovabook_private.commission_replace_required(s,'public.booking_deposit_worker(','jovabook_private.booking_deposit_worker_before_origin(');
 execute $f$create or replace function public.booking_deposit_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $body$
 declare previous text:=coalesce(current_setting('jovabook.online_booking',true),'');result jsonb;begin
 perform set_config('jovabook.online_booking','trusted',true);result:=jovabook_private.booking_deposit_worker_before_origin(p_token,p_action,p_payload);
 perform set_config('jovabook.online_booking',previous,true);return result;
 exception when others then perform set_config('jovabook.online_booking',previous,true);raise;
 end$body$ $f$;
 execute 'revoke all on function jovabook_private.booking_deposit_worker_before_origin(text,text,jsonb) from public,anon,authenticated';
 end if;
end$$;

drop function jovabook_private.commission_replace_required(text,text,text);
commit;


