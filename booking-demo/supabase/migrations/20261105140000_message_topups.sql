-- 60 SMS per seat on paid plans, plus purchasable text and email top-ups.
-- Top-ups are bought through Stripe Checkout on the JovaMedia account and added to a
-- balance. A message uses the monthly allowance first and the balance after that.
-- Patches live definitions in place and fails loudly if a function changed.
begin;

create table jovabook_private.message_credits(
 id uuid primary key default gen_random_uuid(),
 salon_id uuid not null references public.salons(id) on delete cascade,
 channel text not null check(channel in('email','sms')),
 quantity int not null check(quantity>0 and quantity<=100000),
 pence int not null check(pence>0),
 provider_ref text not null unique,
 created_at timestamptz not null default now());
create index message_credits_salon_idx on jovabook_private.message_credits(salon_id,channel);
create table jovabook_private.message_credit_use(
 salon_id uuid not null references public.salons(id) on delete cascade,
 channel text not null check(channel in('email','sms')),
 job_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(salon_id,channel,job_id));
alter table jovabook_private.message_credits enable row level security;
alter table jovabook_private.message_credit_use enable row level security;
revoke all on jovabook_private.message_credits,jovabook_private.message_credit_use from public,anon,authenticated;

create function jovabook_private.message_credit_balance(p_salon uuid,p_channel text) returns int
language sql stable security definer set search_path='' as $$
 select (coalesce((select sum(quantity) from jovabook_private.message_credits where salon_id=p_salon and channel=p_channel),0)
  -(select count(*) from jovabook_private.message_credit_use where salon_id=p_salon and channel=p_channel))::int
$$;
revoke all on function jovabook_private.message_credit_balance(uuid,text) from public,anon,authenticated;

do $$declare src text;n text;begin
 -- 1. Paid plans include 60 SMS per seat; the balances are reported with the limits.
 src:=pg_get_functiondef('jovabook_private.offer_limits(uuid)'::regprocedure);
 n:=$n$then 0 else 50*n end;$n$;
 if position(n in src)=0 then raise exception 'offer_limits SMS allowance changed; review before editing.';end if;
 src:=replace(src,n,$n$then 0 else 60*n end;$n$);
 n:=$n$'deposits_allowed',p in('standard','premium'),$n$;
 if position(n in src)=0 then raise exception 'offer_limits deposits flag missing; apply the deposits migration first.';end if;
 execute replace(src,n,n||$n$'email_credits',jovabook_private.message_credit_balance(p_salon,'email'),'sms_credits',jovabook_private.message_credit_balance(p_salon,'sms'),$n$);

 -- 2. After the monthly allowance, a message spends one purchased credit.
 src:=pg_get_functiondef('jovabook_private.offer_reserve_message(uuid,text,uuid)'::regprocedure);
 n:=$n$if exists(select 1 from jovabook_private.offer_message_usage where salon_id=p_salon and channel=p_channel and job_id=p_job) then return true;end if;$n$;
 if position(n in src)=0 then raise exception 'offer_reserve_message idempotency check changed.';end if;
 src:=replace(src,n,n||$n$
 if exists(select 1 from jovabook_private.message_credit_use where salon_id=p_salon and channel=p_channel and job_id=p_job) then return true;end if;$n$);
 n:=$n$and month=m)>=cap then return false;end if;$n$;
 if position(n in src)=0 then raise exception 'offer_reserve_message allowance check changed.';end if;
 execute replace(src,n,$n$and month=m)>=cap then
  if jovabook_private.message_credit_balance(p_salon,p_channel)<=0 then return false;end if;
  insert into jovabook_private.message_credit_use(salon_id,channel,job_id) values(p_salon,p_channel,p_job) on conflict do nothing;
  return true;
 end if;$n$);

 -- 3. Paid plans with purchased text credit can send even when the monthly allowance is used.
 src:=pg_get_functiondef('jovabook_private.sms_available(uuid,boolean)'::regprocedure);
 n:=$n$coalesce((jovabook_private.offer_limits(p_salon)->>'sms_limit')::int,0)>0$n$;
 if position(n in src)=0 then raise exception 'sms_available changed; review before editing.';end if;
 execute replace(src,n,$n$(coalesce((jovabook_private.offer_limits(p_salon)->>'sms_limit')::int,0)>0 or coalesce((jovabook_private.offer_limits(p_salon)->>'sms_credits')::int,0)>0)$n$);

 -- 4. The per-business SMS safety budget follows the new allowance (3 parts per message).
 src:=pg_get_functiondef('jovabook_private.offer_sms_defaults()'::regprocedure);
 n:=$n$else 150*n end$n$;
 if position(n in src)=0 then raise exception 'offer_sms_defaults changed; review before editing.';end if;
 execute replace(src,n,$n$else 180*n+3*jovabook_private.message_credit_balance(new.salon_id,'sms') end$n$);
end$$;
update jovabook_private.sms_business_settings s set monthly_segment_limit=180*jovabook_private.offer_seats(s.salon_id)
 where coalesce(jovabook_private.offer_plan(s.salon_id),'essential')<>'essential';

-- Server-only worker: records a verified Stripe payment as credit. Safe to repeat.
create function public.booking_topup_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jovabook_private.billing_config;sid uuid;ch text;qty int;pc int;ref text;affected int;begin
 select * into c from jovabook_private.billing_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or c.worker_hash is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>c.worker_hash then raise exception 'Invalid billing worker credentials.' using errcode='42501';end if;
 if p_action<>'credit' then raise exception 'Unknown top-up operation.' using errcode='23514';end if;
 sid:=(p_payload->>'salon')::uuid;ch:=p_payload->>'channel';qty:=(p_payload->>'quantity')::int;pc:=(p_payload->>'pence')::int;ref:=p_payload->>'ref';
 -- Only the published packs can be credited, whatever the caller sends.
 if (ch,qty,pc) not in(('sms',50,500),('sms',100,1000),('sms',200,2000),('email',1000,500),('email',5000,2000)) then raise exception 'Unknown top-up pack.' using errcode='23514';end if;
 if coalesce(ref,'')!~'^(pi|cs)_[A-Za-z0-9_]{6,200}$' then raise exception 'Invalid payment reference.' using errcode='23514';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-messages:'||sid::text));
 if not exists(select 1 from public.salons where id=sid) then return null;end if;
 insert into jovabook_private.message_credits(salon_id,channel,quantity,pence,provider_ref) values(sid,ch,qty,pc,ref) on conflict(provider_ref) do nothing;
 get diagnostics affected=row_count;
 if affected=1 and ch='sms' then update jovabook_private.sms_business_settings set monthly_segment_limit=monthly_segment_limit+3*qty where salon_id=sid and monthly_segment_limit>0;end if;
 return jsonb_build_object('ok',true,'duplicate',affected=0,'sms_credits',jovabook_private.message_credit_balance(sid,'sms'),'email_credits',jovabook_private.message_credit_balance(sid,'email'));
end$$;
revoke all on function public.booking_topup_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_topup_worker(text,text,jsonb) to anon,authenticated;

notify pgrst,'reload schema';
commit;
