-- Publish the saved deposit rule, not private payment or provider records.
begin;
create or replace function public.public_salon(p_slug text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;sid uuid;holds jsonb;available boolean;payment jsonb;begin
 result:=jovabook_private.deposit_original_public_salon(p_slug);if result is null then return null;end if;
 sid:=(result->>'id')::uuid;
 select payments into payment from public.salons where id=sid;
 result:=jsonb_set(result,'{payments}',jsonb_build_object(
  'enabled',coalesce((payment->>'enabled')::boolean,false),
  'deposit',coalesce((payment->>'deposit')::numeric,0)
 )||case when payment ? 'deposit_percent' then jsonb_build_object('deposit_percent',(payment->>'deposit_percent')::numeric) else '{}'::jsonb end);
 select coalesce(jsonb_agg(jsonb_build_object('id','hold_'||h.id,'date',h.date,'time',h.time,'duration',h.duration,'staffId',h.staff_id,'status','confirmed')),'[]') into holds
 from jovabook_private.deposit_checkouts h where h.salon_id=sid and h.stage in('creating','open','needs_attention');
 select coalesce(c.payments_enabled and a.verified and i.summary->>'connection_method'='provider_login' and i.summary->>'account_id'=a.account_id,false) into available
 from jovabook_private.customer_config c left join jovabook_private.customer_payment_accounts a on a.salon_id=sid
 left join jovabook_private.business_integrations i on i.salon_id=sid and i.provider='stripe' where c.singleton;
 return jsonb_set(result,'{busy}',coalesce(result->'busy','[]')||holds)||jsonb_build_object('deposit_checkout_available',coalesce(available,false));
end$$;
commit;
