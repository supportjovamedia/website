begin;
alter table jovabook_private.deposit_checkouts add column sms_consent boolean not null default false;
do $migration$
declare src text;
begin
 src:=pg_get_functiondef('jovabook_private.deposit_worker_before_attention(text,text,jsonb)'::regprocedure);
 if position('coalesce(p_payload->>''notes'',''''),dep::int) returning * into h;' in src)=0 or position('source,status,deposit)' in src)=0 or position('phone,notes,amount)' in src)=0 or position('outcome,h.amount/100.0) returning * into rec;' in src)=0 then raise exception 'Review deposit SMS insertion points.';end if;
 src:=replace(src,'phone,notes,amount)','phone,notes,amount,sms_consent)');
 src:=replace(src,'coalesce(p_payload->>''notes'',''''),dep::int) returning * into h;',
 'coalesce(p_payload->>''notes'',''''),dep::int,coalesce((p_payload->>''sms_consent'')::boolean,false) and jovabook_private.sms_available(s.id) and jovabook_private.sms_phone(p_payload->>''phone'') is not null) returning * into h;');
 src:=replace(src,'source,status,deposit)','source,status,deposit,sms_consent)');
 src:=replace(src,'outcome,h.amount/100.0) returning * into rec;','outcome,h.amount/100.0,h.sms_consent) returning * into rec;');
 execute src;
end $migration$;
notify pgrst,'reload schema';
commit;
