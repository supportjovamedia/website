-- SMS reminders: accept US mobile numbers (+1) as well as UK mobiles. Canonical form is digits only.
create or replace function jovabook_private.sms_phone(p_phone text) returns text language plpgsql immutable set search_path='' as $$
declare n text:=regexp_replace(coalesce(p_phone,''),'[[:space:]().-]','','g');
begin
 if n ~ '^07[0-9]{9}$' then n:='44'||substr(n,2);
 elsif n ~ '^\+447[0-9]{9}$' then n:=substr(n,2);
 elsif n ~ '^00447[0-9]{9}$' then n:=substr(n,3);
 elsif n ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$' then n:=substr(n,2);
 elsif n ~ '^001[2-9][0-9]{2}[2-9][0-9]{6}$' then n:=substr(n,3);end if;
 return case when n ~ '^447[0-9]{9}$' or n ~ '^1[2-9][0-9]{2}[2-9][0-9]{6}$' then n else null end;
end $$;

do $m$
declare f record;src text;n text:='Enter a valid UK mobile number for an SMS reminder.';hits int:=0;
begin
 -- The booking function has been wrapped and renamed by earlier migrations, so patch whichever definition holds the message.
 for f in select p.oid from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname in('public','jovabook_private') and p.prokind='f' and pg_get_functiondef(p.oid) like '%'||n||'%' loop
  src:=pg_get_functiondef(f.oid);execute replace(src,n,'Enter a valid UK or US mobile number for an SMS reminder.');hits:=hits+1;
 end loop;
 if hits<>1 then raise exception 'Expected exactly one function with the UK-only message, found %',hits;end if;
end $m$;
