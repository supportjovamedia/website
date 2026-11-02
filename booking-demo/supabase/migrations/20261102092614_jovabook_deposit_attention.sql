begin;
alter table jovabook_private.deposit_checkouts add column attention_reason text;
alter table jovabook_private.deposit_checkouts add column resolution text;
alter function public.booking_deposit_worker(text,text,jsonb) rename to deposit_worker_before_attention;
alter function public.deposit_worker_before_attention(text,text,jsonb) set schema jovabook_private;
revoke all on function jovabook_private.deposit_worker_before_attention(text,text,jsonb) from public,anon,authenticated;
create function public.booking_deposit_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare cfg jovabook_private.customer_config;h jovabook_private.deposit_checkouts;result jsonb;attention jsonb;sid uuid;
begin
 select * into cfg from jovabook_private.customer_config where singleton;
 if cfg.worker_hash is null or p_token is null or length(p_token)<>64 or cfg.worker_hash<>encode(sha256(convert_to(p_token,'UTF8')),'hex') then raise exception 'Invalid deposit worker.' using errcode='42501';end if;
 if p_action in('attention','externally_refunded') then
  select * into h from jovabook_private.deposit_checkouts where id=(p_payload->>'id')::uuid;
  if h.id is null then raise exception 'Checkout not found.';end if;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||h.salon_id::text));
  perform pg_advisory_xact_lock(hashtext(h.salon_id::text||h.date::text));
  select * into h from jovabook_private.deposit_checkouts where id=h.id for update;
  if h.account_id is distinct from p_payload->>'account_id' or h.provider_id is null or h.provider_id is distinct from p_payload->>'provider_id' or coalesce(p_payload->>'payment_intent','')!~'^pi_[A-Za-z0-9]+$' then raise exception 'Payment account mismatch.';end if;
  if h.stage='paid' then raise exception 'Booking already confirmed.';end if;
  if h.stage='expired' then return jsonb_build_object('ok',true,'stage',case when h.resolution='externally_refunded' then 'refunded' else 'expired' end);end if;
  if p_action='externally_refunded' then
   if (p_payload->>'amount')::int is distinct from h.amount or p_payload->>'currency' is distinct from h.currency then raise exception 'Refund proof mismatch.';end if;
   update jovabook_private.deposit_checkouts set stage='expired',resolution='externally_refunded',payment_intent=p_payload->>'payment_intent',finished_at=now() where id=h.id;
   return jsonb_build_object('ok',true,'stage','refunded');
  end if;
  if coalesce(p_payload->>'reason','') not in('external_refund','dispute') then raise exception 'Invalid attention reason.';end if;
  update jovabook_private.deposit_checkouts set stage='needs_attention',attention_reason=p_payload->>'reason',payment_intent=p_payload->>'payment_intent' where id=h.id;
  return jsonb_build_object('ok',true,'stage','needs_attention');
 end if;
 result:=jovabook_private.deposit_worker_before_attention(p_token,p_action,p_payload);
 if p_action in('owner_status','owner_save','owner_verify') then
  sid:=(p_payload->>'salon_id')::uuid;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into attention from (
   select id,account_id,payment_intent,service_name,name,email,date,time,amount,attention_reason
   from jovabook_private.deposit_checkouts where salon_id=sid and stage='needs_attention' order by created_at limit 20
  ) x;
  result:=result||jsonb_build_object('attention',attention);
 end if;
 return result;
end$$;
revoke all on function public.booking_deposit_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_deposit_worker(text,text,jsonb) to anon;
notify pgrst,'reload schema';
commit;
