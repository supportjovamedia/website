begin;

-- Reuse the existing salted anti-repeat ledger. Retain no business or Auth ID,
-- email, name, contact data, settings or customer records in this new marker.
alter table jovabook_private.trial_ledger add column business_deleted_at timestamptz;

create function jovabook_private.mark_trial_business_deleted() returns trigger
language plpgsql security definer set search_path='' as $$
declare account_email text;
begin
 if tg_table_schema='auth' and tg_table_name='users' then
  -- Auth cascades can remove the parent before a salon trigger can read it.
  if not exists(select 1 from public.salons where owner_id=old.id) then return old;end if;
  account_email:=old.email;
 else
  select email into account_email from auth.users where id=old.owner_id;
 end if;
 if account_email is not null then
  update jovabook_private.trial_ledger
  set business_deleted_at=coalesce(business_deleted_at,now())
  where email_hash=jovabook_private.trial_fingerprint(account_email);
 end if;
 return old;
end$$;
revoke all on function jovabook_private.mark_trial_business_deleted() from public,anon,authenticated;
create trigger trial_history_before_business_delete before delete on public.salons
for each row execute function jovabook_private.mark_trial_business_deleted();
create trigger trial_history_before_auth_delete before delete on auth.users
for each row execute function jovabook_private.mark_trial_business_deleted();

-- A second domain-separated digest prevents returning the private email hash.
-- Historical deletions without a recoverable email link remain unrecorded.
create function public.operator_trial_history() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;record_count bigint;
begin
 perform jovabook_private.require_operator();
 select count(*) into record_count from jovabook_private.trial_ledger;
 select coalesce(jsonb_agg(item order by used_at desc,reference),'[]') into result from (
  select used_at,
   'trial_'||encode(sha256(convert_to('jovabook-trial-history-v1:'||email_hash,'UTF8')),'hex') reference,
   jsonb_build_object(
    'reference','trial_'||encode(sha256(convert_to('jovabook-trial-history-v1:'||email_hash,'UTF8')),'hex'),
    'trial_used_at',used_at,'deleted',business_deleted_at is not null,'deleted_at',business_deleted_at) item
  from jovabook_private.trial_ledger order by used_at desc,email_hash limit 200
 ) records;
 return jsonb_build_object('ok',true,'history',result,'total',record_count,'has_more',record_count>200);
end$$;
revoke all on function public.operator_trial_history() from public,anon,authenticated;
grant execute on function public.operator_trial_history() to authenticated;
notify pgrst,'reload schema';
commit;
