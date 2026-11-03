begin;
-- Branding follows the same verified billing entitlement as the owner's workspace.
do $migration$
declare src text;
begin
 src:=pg_get_functiondef('public.customer_portal_bookings(text)'::regprocedure);
 if position('''timezone'',coalesce(s.settings->>''timezone'',''Europe/London'')' in src)=0 then raise exception 'Review customer branding insertion point.';end if;
 execute replace(src,'''timezone'',coalesce(s.settings->>''timezone'',''Europe/London'')',
 '''branding_required'',coalesce(jovabook_private.billing_effective_plan(s.id),''essential'')<>''premium'',''timezone'',coalesce(s.settings->>''timezone'',''Europe/London'')');
end $migration$;

-- One provider attempt per appointment, including uncertain provider responses.
create unique index sms_one_attempt_per_appointment on jovabook_private.sms_queue(salon_id,booking_id) where attempted;
create or replace function jovabook_private.sms_booking_changed() returns trigger
language plpgsql security definer set search_path='' as $$
declare rev text;item record;due timestamptz;starts timestamptz;
begin
 if tg_op='DELETE' then
  for item in select id from jovabook_private.sms_queue where salon_id=old.salon_id and booking_id=old.id and status in('Scheduled','Leased','Prepared','Sending') loop perform jovabook_private.sms_cancel(item.id,'Booking deleted.');end loop;
  return old;
 end if;
 rev:=jovabook_private.sms_revision(new);
 if tg_op='UPDATE' and jovabook_private.sms_revision(old)=rev then return new;end if;
 for item in select id from jovabook_private.sms_queue where salon_id=new.salon_id and booking_id=new.id and revision<>rev and status in('Scheduled','Leased','Prepared','Sending') loop
  perform jovabook_private.sms_cancel(item.id,'Booking changed or SMS consent was withdrawn.');
 end loop;
 starts:=jovabook_private.sms_start(new);due:=greatest(now(),starts-interval '24 hours');
 if new.status='confirmed' and new.sms_consent and jovabook_private.sms_phone(new.phone) is not null and starts>now()
 and exists(select 1 from public.salons where id=new.salon_id and plan in('standard','premium'))
 and not exists(select 1 from jovabook_private.sms_queue where salon_id=new.salon_id and booking_id=new.id and attempted) then
  insert into jovabook_private.sms_queue(salon_id,booking_id,revision,due_at) values(new.salon_id,new.id,rev,due) on conflict do nothing;
 end if;
 return new;
end$$;
revoke all on function jovabook_private.sms_booking_changed() from public,anon,authenticated;

do $migration$
declare src text;old_body text;
begin
 src:=pg_get_functiondef('public.booking_sms_worker(text,text,jsonb)'::regprocedure);
 old_body:=$body$body:=left(regexp_replace(s.name,'[[:cntrl:]]',' ','g'),40)||': Your booking is '||to_char(b.date,'DD Mon YYYY')||' at '||b.time||' ('||jovabook_private.sms_timezone(b.salon_id)||').';$body$;
 if position(old_body in src)=0 or position('if p_action=''begin'' then' in src)=0 then raise exception 'Review SMS worker insertion points.';end if;
 src:=replace(src,old_body,$body$body:='Reminder: next appt at '||ltrim(to_char(b.time::time,'HH12:MIam'),'0')||' on '||to_char(b.date,'FMDay, DD Mon YYYY')||'. '||left(regexp_replace(s.name,'[[:cntrl:]]',' ','g'),80)||case when trim(coalesce(s.address,''))<>'' then ', '||left(trim(split_part(split_part(s.address,chr(10),1),',',1)),100) else '' end||'.';$body$);
 src:=replace(src,'if p_action=''begin'' then',$body$if p_action='begin' then
   if exists(select 1 from jovabook_private.sms_queue other where other.salon_id=q.salon_id and other.booking_id=q.booking_id and other.attempted and other.id<>q.id) then perform jovabook_private.sms_cancel(q.id,'This appointment already had a reminder attempt.');return null;end if;$body$);
 execute src;
end $migration$;

create function jovabook_private.sms_plan_defaults() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.plan in('standard','premium') then
  insert into jovabook_private.sms_business_settings(salon_id,enabled,monthly_segment_limit,max_segments_per_message)
  values(new.id,true,50,3) on conflict(salon_id) do nothing;
 end if;return new;
end$$;
revoke all on function jovabook_private.sms_plan_defaults() from public,anon,authenticated;
create trigger sms_plan_defaults after insert or update of plan on public.salons for each row execute function jovabook_private.sms_plan_defaults();
insert into jovabook_private.sms_business_settings(salon_id,enabled,monthly_segment_limit,max_segments_per_message)
 select id,true,50,3 from public.salons where plan in('standard','premium') on conflict(salon_id) do nothing;
notify pgrst,'reload schema';
commit;
