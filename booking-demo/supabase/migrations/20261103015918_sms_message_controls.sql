begin;
alter table jovabook_private.sms_business_settings add column message_template text not null default 'Reminder: next appt at {time} on {day}, {date}. {business}, {address}.' check(length(message_template) between 1 and 320);
create function jovabook_private.sms_template_valid(value text) returns boolean language sql immutable set search_path='' as $$
 select length(trim(value)) between 1 and 320 and strpos(value,'{time}')>0 and strpos(value,'{date}')>0 and strpos(value,'{business}')>0
 and regexp_replace(value,'\{(time|day|date|business|address)\}','','g')!~'[{}]'
$$;
create function jovabook_private.sms_render_message(template text,business text,address text,appt_date date,appt_time text) returns text language plpgsql immutable set search_path='' as $$
declare body text:=regexp_replace(template,'[[:cntrl:]]',' ','g');begin
 body:=replace(body,'{time}',ltrim(to_char(appt_time::time,'HH12:MIam'),'0'));
 body:=replace(body,'{day}',to_char(appt_date,'FMDay'));body:=replace(body,'{date}',to_char(appt_date,'DD Mon YYYY'));
 body:=replace(body,'{business}',left(regexp_replace(business,'[[:cntrl:]]',' ','g'),80));
 body:=replace(body,'{address}',left(trim(split_part(split_part(coalesce(address,''),chr(10),1),',',1)),100));
 return trim(regexp_replace(body,',[[:space:]]*\.','.','g'));
end$$;
revoke all on function jovabook_private.sms_template_valid(text),jovabook_private.sms_render_message(text,text,text,date,text) from public,anon,authenticated;
alter function public.sms_reminder_info() set schema jovabook_private;
alter function jovabook_private.sms_reminder_info() rename to message_original_sms_reminder_info;
revoke all on function jovabook_private.message_original_sms_reminder_info() from public,anon,authenticated;
create function public.sms_reminder_info() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;message text;begin
 result:=jovabook_private.message_original_sms_reminder_info();
 select p.message_template into message from jovabook_private.sms_business_settings p join public.salons s on s.id=p.salon_id where s.owner_id=auth.uid();
 return result||jsonb_build_object('message_template',coalesce(message,'Reminder: next appt at {time} on {day}, {date}. {business}, {address}.'));
end$$;
create function public.set_sms_message(p_message text,p_salon uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.salons;message text:=trim(regexp_replace(p_message,'[[:cntrl:]]',' ','g'));begin
 select * into s from public.salons where id=p_salon and owner_id=auth.uid();
 if s.id is null or not jovabook_private.billing_open(s.id) or jovabook_private.billing_effective_plan(s.id) not in('standard','premium') then raise exception 'Text reminders are available on Standard and Premium.' using errcode='42501';end if;
 if not coalesce(jovabook_private.sms_template_valid(message),false) then raise exception 'Use up to 320 characters and include {time}, {date} and {business}.' using errcode='22023';end if;
 if jovabook_private.sms_segments(jovabook_private.sms_render_message(message,s.name,s.address,date '2026-09-30','12:59'))>3 then raise exception 'Shorten your message to at most three SMS credits.' using errcode='22023';end if;
 update jovabook_private.sms_business_settings set message_template=message where salon_id=s.id;
 if not found then raise exception 'SMS settings are unavailable.';end if;
 return public.sms_reminder_info();
end$$;
revoke all on function public.sms_reminder_info(),public.set_sms_message(text,uuid) from public,anon,authenticated;
grant execute on function public.sms_reminder_info(),public.set_sms_message(text,uuid) to authenticated;
do $migration$
declare src text;start_at integer;end_at integer;begin
 src:=pg_get_functiondef('public.booking_sms_worker(text,text,jsonb)'::regprocedure);
 start_at:=strpos(src,'body:=''Reminder: next appt at ');end_at:=strpos(substr(src,start_at),chr(10)||'  parts:=');
 if start_at=0 or end_at=0 then raise exception 'Review SMS message rendering insertion point.';end if;
 src:=substr(src,1,start_at-1)||'body:=jovabook_private.sms_render_message(p.message_template,s.name,s.address,b.date,b.time);'||substr(src,start_at+end_at-1);
 execute src;
end $migration$;
create function public.operator_sms_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 perform jovabook_private.require_operator();
 select jsonb_build_object('ok',true,'period_start',date_trunc('month',now()),
 'sent',count(*) filter(where status in('Sent','Delivered')),'delivered',count(*) filter(where status='Delivered'),
 'queued',count(*) filter(where status in('Scheduled','Leased','Prepared','Sending')),'failed',count(*) filter(where status='Failed'),'unknown',count(*) filter(where status='Unknown')) into result
 from jovabook_private.sms_queue where budget_month=jovabook_private.sms_budget_month(now()) or (not attempted and created_at>=date_trunc('month',now()));
 return result||jsonb_build_object('businesses',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(
 select s.id,s.name,s.plan,count(q.id) filter(where q.status in('Sent','Delivered')) sent,
 count(q.id) filter(where q.status='Delivered') delivered,count(q.id) filter(where q.status in('Scheduled','Leased','Prepared','Sending')) queued,
 coalesce(sum(q.segments) filter(where q.attempted),0) credits_reserved
 from public.salons s left join jovabook_private.sms_queue q on q.salon_id=s.id and (q.budget_month=jovabook_private.sms_budget_month(now()) or (not q.attempted and q.created_at>=date_trunc('month',now())))
 where s.plan in('standard','premium') or q.id is not null group by s.id order by s.name,s.id) x));
end$$;
revoke all on function public.operator_sms_overview() from public,anon,authenticated;
grant execute on function public.operator_sms_overview() to authenticated;
notify pgrst,'reload schema';
commit;
