-- The queue workers were called over HTTP every minute even when nothing was waiting.
-- Each scheduler now returns early unless its queue has work that is due.
-- Patches the live definitions in place and fails loudly if a function changed.
begin;

do $$declare src text;n text;begin
 -- Email: only call the worker when a message is due or being sent.
 src:=pg_get_functiondef('jovabook_private.invoke_email_worker()'::regprocedure);
 n:=$n$if not (select enabled from jovabook_private.email_config where singleton) then return null; end if;$n$;
 if position(n in src)=0 then raise exception 'invoke_email_worker changed; review before adding the idle check.';end if;
 execute replace(src,n,n||$n$
  if not exists(select 1 from jovabook_private.email_queue where status in ('Queued','Scheduled','Sending') and due_at<=now()) then return null; end if;$n$);

 -- SMS: due reminders, sends that may need reconciling, and delivery polling.
 src:=pg_get_functiondef('jovabook_private.invoke_sms_worker()'::regprocedure);
 n:=$n$if not (select enabled from jovabook_private.sms_config where singleton) then return null;end if;$n$;
 if position(n in src)=0 then raise exception 'invoke_sms_worker changed; review before adding the idle check.';end if;
 execute replace(src,n,n||$n$
 if not exists(select 1 from jovabook_private.sms_queue where (status in('Scheduled','Leased','Prepared') and due_at<=now()) or status='Sending' or (status='Sent' and provider_id is not null and poll_after<=now())) then return null;end if;$n$);

 -- Customer payments: reconcile only when a checkout is unfinished, refund only when one is open.
 src:=pg_get_functiondef('jovabook_private.invoke_customer_payment_workers()'::regprocedure);
 n:=$n$deposit_job:=net.http_post(url:='https://www.jovamedia.com/api/jovabook/deposits/reconcile',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=120000);$n$;
 if position(n in src)=0 then raise exception 'invoke_customer_payment_workers deposit call changed; review before adding the idle check.';end if;
 src:=replace(src,n,$n$if exists(select 1 from jovabook_private.deposit_checkouts where stage in('creating','open','needs_attention')) then
  $n$||n||$n$
 end if;$n$);
 n:=$n$refund_job:=net.http_post(url:='https://www.jovamedia.com/api/jovabook/customer/refund-worker',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=120000);$n$;
 if position(n in src)=0 then raise exception 'invoke_customer_payment_workers refund call changed; review before adding the idle check.';end if;
 execute replace(src,n,$n$if exists(select 1 from jovabook_private.customer_refunds where status in('requested','sending','pending')) then
  $n$||n||$n$
 end if;$n$);
end$$;

notify pgrst,'reload schema';
commit;
