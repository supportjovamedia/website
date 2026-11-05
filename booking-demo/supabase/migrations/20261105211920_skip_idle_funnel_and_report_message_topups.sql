begin;
do $patch$declare src text;needle text;begin
src:=pg_get_functiondef('jovabook_private.invoke_funnel_worker()'::regprocedure);
needle:=' select decrypted_secret into secret from vault.decrypted_secrets';
if position('funnel_outbox where' in src)=0 then
 if position(needle in src)=0 then raise exception 'Funnel worker changed; review before patching.';end if;
 execute replace(src,needle,$guard$
 if not exists(select 1 from jovabook_private.funnel_outbox where state in ('pending','sending') and (state='pending' or lease_until<now()) and available_at<=now()) then return null;end if;
$guard$||needle);
end if;
src:=pg_get_functiondef('jovabook_private.operator_events()'::regprocedure);
needle:=' ) events order by event_at desc limit 12';
if position('message_credits c' in src)=0 then
 if position(needle in src)=0 then raise exception 'Operator events changed; review before patching.';end if;
 execute replace(src,needle,$events$
 union all select 'topup:'||c.id::text,s.id,s.name,
 c.quantity::text||case when c.channel='sms' then ' SMS credits' else ' email credits' end||' purchased (£'||to_char(c.pence/100.0,'FM999999990.00')||')',c.created_at
 from jovabook_private.message_credits c join public.salons s on s.id=c.salon_id where c.created_at>now()-interval '14 days'
$events$||needle);
end if;end$patch$;
commit;
