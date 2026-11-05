begin;
-- Current offer: all Insights belong to Solo and Team; staff management remains Team only.
-- Patch the existing function so its payment, allowance and credit rules are preserved.
do $patch$
declare src text;
 old_rule text := '''insights'',p=''premium'',''period_comparisons'',p=''premium''';
 new_rule text := '''insights'',p in(''standard'',''premium''),''period_comparisons'',p in(''standard'',''premium'')';
begin
 src:=pg_get_functiondef('jovabook_private.offer_limits(uuid)'::regprocedure);
 if position(new_rule in src)>0 then return;end if;
 if position(old_rule in src)=0 then raise exception 'Insights entitlement function changed. Review before deploying.';end if;
 execute replace(src,old_rule,new_rule);
 if position(new_rule in pg_get_functiondef('jovabook_private.offer_limits(uuid)'::regprocedure))=0 then
  raise exception 'Solo Insights entitlement update did not apply.';
 end if;
end $patch$;
notify pgrst,'reload schema';
commit;
