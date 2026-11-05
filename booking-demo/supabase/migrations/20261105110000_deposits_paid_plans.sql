-- Stripe deposits belong to Pro Solo and Pro Team. Starter is booking only.
-- Patches the live definitions in place and fails loudly if the foundation changed.
begin;

do $$declare src text;n text;begin
 -- 1. The plan limits advertise whether deposits are allowed.
 src:=pg_get_functiondef('jovabook_private.offer_limits(uuid)'::regprocedure);
 n:=$n$'embed_allowed',p in('standard','premium'),$n$;
 if position(n in src)=0 then raise exception 'offer_limits changed; review before adding the deposits gate.';end if;
 execute replace(src,n,n||$n$'deposits_allowed',p in('standard','premium'),$n$);

 -- 2. A Starter business never has a deposit due, whatever its stored settings say.
 src:=pg_get_functiondef('jovabook_private.online_deposit_pence(uuid,numeric)'::regprocedure);
 n:=$n$select payments into payment from public.salons where id=p_salon;$n$;
 if position(n in src)=0 then raise exception 'online_deposit_pence changed; review before adding the deposits gate.';end if;
 execute replace(src,n,n||$n$
 if coalesce(jovabook_private.offer_plan(p_salon),'essential')='essential' then return 0;end if;$n$);

 -- 3. The public booking page sees no deposit on Starter, so customers can simply book.
 src:=pg_get_functiondef('public.public_salon(text)'::regprocedure);
 n:=$n$return result||jsonb_build_object('offer_version','2026-11-free-v1','branding_required',(limits->>'branding_required')::boolean,$n$;
 if position(n in src)=0 then raise exception 'public_salon changed; review before adding the deposits gate.';end if;
 execute replace(src,n,$n$if coalesce((limits->>'deposits_allowed')::boolean,false) is not true then
  result:=jsonb_set(result,'{deposit_checkout_available}','false'::jsonb,true);
  if result ? 'payments' then result:=jsonb_set(result,'{payments}',jsonb_build_object('enabled',false,'deposit',0,'deposit_percent',0),true);end if;
 end if;
 return result||jsonb_build_object('offer_version','2026-11-free-v1','deposits_allowed',coalesce((limits->>'deposits_allowed')::boolean,false),'branding_required',(limits->>'branding_required')::boolean,$n$);
end$$;

-- 4. A Starter business cannot switch deposits on. Switching off, and saving
-- other settings, always works, so a downgraded business is never trapped.
create function jovabook_private.deposits_plan_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if coalesce((new.payments->>'enabled')::boolean,false) and not coalesce((old.payments->>'enabled')::boolean,false)
  and coalesce(jovabook_private.offer_plan(new.id),'essential')='essential' then
  raise exception 'Stripe deposits are available on Pro Solo and Pro Team.' using errcode='42501';
 end if;
 return new;
end$$;
revoke all on function jovabook_private.deposits_plan_guard() from public,anon,authenticated;
create trigger deposits_plan_guard before update of payments on public.salons
 for each row execute function jovabook_private.deposits_plan_guard();

notify pgrst,'reload schema';
commit;
