-- Plan names are now Free, Solo and Team. Rewrites the customer-facing messages inside existing
-- functions (booking limit, deposits, team logins) without touching anything else. Safe to repeat.
do $$declare r record;src text;n integer:=0;begin
 for r in select p.oid,pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace s on s.oid=p.pronamespace
  where s.nspname in('public','jovabook_private') and p.prokind='f' and (p.prosrc like '%Pro Solo%' or p.prosrc like '%Pro Team%')
 loop
  src:=replace(replace(r.def,'Pro Solo','Solo'),'Pro Team','Team');
  if src<>r.def then execute src;n:=n+1;end if;
 end loop;
 raise notice 'plan names updated in % functions',n;
end$$;
notify pgrst,'reload schema';
