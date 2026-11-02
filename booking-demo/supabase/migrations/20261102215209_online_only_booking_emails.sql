begin;
-- A staff diary entry is not a customer request for automatic booking emails.
-- Prefer immutable server origin. Only legacy rows without a snapshot may use
-- the stored booking source. Unknown/missing origins do not infer consent.
create function jovabook_private.booking_email_origin_allowed(p_salon uuid,p_booking text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select o.source from jovabook_private.commission_origins o where o.salon_id=p_salon and o.booking_id=p_booking),
  (select b.source from public.bookings b where b.salon_id=p_salon and b.id=p_booking),'Unknown')='Online'
$$;
revoke all on function jovabook_private.booking_email_origin_allowed(uuid,text) from public,anon,authenticated;
do $migration$
declare definition text;needle text;replacement text;begin
 definition:=pg_get_functiondef('jovabook_private.enqueue_booking_email(public.bookings,text,timestamp with time zone)'::regprocedure);
 needle:='if s.id is null then return; end if;';
 replacement:=$patch$if s.id is null then return; end if;
  if p_kind in('confirmed','rescheduled','cancelled','reminder','no-show') and not jovabook_private.booking_email_origin_allowed(b.salon_id,b.id) then return;end if;$patch$;
 if strpos(definition,needle)=0 then raise exception 'Unexpected booking email enqueue foundation.';end if;
 execute replace(definition,needle,replacement);
 definition:=pg_get_functiondef('public.booking_email_worker(text,text,jsonb)'::regprocedure);
 needle:='if q.audience=''owner'' and q.kind=''confirmed'' and jovabook_private.suppress_owner_booking_confirmation(q.salon_id,q.booking_id) then';
 if strpos(definition,needle)=0 then raise exception 'Unexpected previous owner confirmation guard.';end if;
 definition:=replace(definition,needle,'if q.provider_id is null and q.audience=''owner'' and q.kind=''confirmed'' and jovabook_private.suppress_owner_booking_confirmation(q.salon_id,q.booking_id) then');

 needle:='and due_at<=now() and (lease_until is null or lease_until<now())';
 replacement:=$patch$and due_at<=now() and (lease_until is null or lease_until<now())
      and (provider_id is null or kind not in('confirmed','rescheduled','cancelled','reminder','no-show') or jovabook_private.booking_email_origin_allowed(salon_id,booking_id))$patch$;
 if strpos(definition,needle)=0 then raise exception 'Unexpected booking email due selector.';end if;
 definition:=replace(definition,needle,replacement);
 needle:='if q.attempts>=8';
 replacement:=$patch$if q.kind in('confirmed','rescheduled','cancelled','reminder','no-show') and not jovabook_private.booking_email_origin_allowed(q.salon_id,q.booking_id) then
        if q.provider_id is null then perform jovabook_private.record_email_status(q.id,'Cancelled','Automatic booking emails apply only to customer-created online bookings.');end if;continue;
      end if;
      if q.attempts>=8$patch$;
 if strpos(definition,needle)=0 then raise exception 'Unexpected booking email claim foundation.';end if;
 definition:=replace(definition,needle,replacement);
 needle:='update jovabook_private.email_queue set provider_payload=coalesce(provider_payload,p_payload->''mail'')';
 replacement:=$patch$if q.kind in('confirmed','rescheduled','cancelled','reminder','no-show') and not jovabook_private.booking_email_origin_allowed(q.salon_id,q.booking_id) then
     if q.provider_id is null then perform jovabook_private.record_email_status(q.id,'Cancelled','Automatic booking emails apply only to customer-created online bookings.');end if;return null;
    end if;
    update jovabook_private.email_queue set provider_payload=coalesce(provider_payload,p_payload->'mail')$patch$;
 if strpos(definition,needle)=0 then raise exception 'Unexpected booking email prepare foundation.';end if;
 execute replace(definition,needle,replacement);
end$migration$;
-- Retain delivered/provider-accepted evidence; stop only unsent booking jobs.
do $$declare job record;begin
 for job in select q.id from jovabook_private.email_queue q
 where q.kind in('confirmed','rescheduled','cancelled','reminder','no-show') and q.status in('Queued','Scheduled','Sending') and q.provider_id is null
 and not jovabook_private.booking_email_origin_allowed(q.salon_id,q.booking_id)
 loop perform jovabook_private.record_email_status(job.id,'Cancelled','Automatic booking emails apply only to customer-created online bookings.');end loop;
end$$;
commit;
