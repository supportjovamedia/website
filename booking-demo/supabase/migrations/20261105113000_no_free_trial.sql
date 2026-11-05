-- No free trial. Starter is the free tier; paid plans take a card and charge at once.
-- Existing trialing subscriptions keep working until they end. Only new trials stop.
-- Patches live definitions in place and fails loudly if any of them changed.
begin;

do $$declare r record;src text;patched int;
 needles text[][]:=array[
  array['eligible:=p_payload->>''kind''=''checkout'' and trial_row.started_at is null;','eligible:=false;'],
  array['''trial_eligible'',trial_row.started_at is null,','''trial_eligible'',false,'],
  array['''trial_eligible'',not exists(','''trial_eligible'',false and not exists(']];
 i int;begin
 for i in 1..array_length(needles,1) loop
  patched:=0;
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in('public','jovabook_private') and p.prokind='f' and position(needles[i][1] in pg_get_functiondef(p.oid))>0 loop
   src:=pg_get_functiondef(r.oid);
   execute replace(src,needles[i][1],needles[i][2]);
   patched:=patched+1;
  end loop;
  if patched=0 then raise exception 'Trial rule % not found; review before removing the free trial.',i;end if;
 end loop;
end$$;

notify pgrst,'reload schema';
commit;
