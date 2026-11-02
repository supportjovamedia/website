begin;
-- The immutable server origin is authoritative; older diary rows use their
-- stored source. Only owner new-booking confirmations are suppressed.
create function jovabook_private.suppress_owner_booking_confirmation(p_salon uuid,p_booking text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select o.source from jovabook_private.commission_origins o where o.salon_id=p_salon and o.booking_id=p_booking),
  (select b.source from public.bookings b where b.salon_id=p_salon and b.id=p_booking),'Unknown')='Manual'
$$;
revoke all on function jovabook_private.suppress_owner_booking_confirmation(uuid,text) from public,anon,authenticated;
do $migration$
declare definition text;needle text;replacement text;begin
 definition:=pg_get_functiondef('jovabook_private.enqueue_booking_email(public.bookings,text,timestamp with time zone)'::regprocedure);
 needle:='addr:=case audience when ''customer'' then b.email else s.email end;';
 replacement:=$patch$if audience='owner' and p_kind='confirmed' and jovabook_private.suppress_owner_booking_confirmation(b.salon_id,b.id) then
   update public.email_log set owner_status='Cancelled',updated_at=now() where salon_id=s.id and id=event;
   continue;
  end if;
  addr:=case audience when 'customer' then b.email else s.email end;$patch$;
 if strpos(definition,needle)=0 then raise exception 'Unexpected booking email enqueue foundation.';end if;
 execute replace(definition,needle,replacement);
 definition:=pg_get_functiondef('public.booking_email_worker(text,text,jsonb)'::regprocedure);
 needle:='if q.attempts>=8';
 replacement:=$patch$if q.audience='owner' and q.kind='confirmed' and jovabook_private.suppress_owner_booking_confirmation(q.salon_id,q.booking_id) then
        perform jovabook_private.record_email_status(q.id,'Cancelled','Staff diary entry: owner confirmation is not needed.');continue;
      end if;
      if q.attempts>=8$patch$;
 if strpos(definition,needle)=0 then raise exception 'Unexpected booking email claim foundation.';end if;
 definition:=replace(definition,needle,replacement);
 needle:='if not cfg.enabled then return null; end if;';
 replacement:=$patch$if not cfg.enabled then return null; end if;
    select * into q from jovabook_private.email_queue where id=(p_payload->>'id')::uuid and lease_id=(p_payload->>'lease')::uuid for update;
    if q.audience='owner' and q.kind='confirmed' and jovabook_private.suppress_owner_booking_confirmation(q.salon_id,q.booking_id) then
     perform jovabook_private.record_email_status(q.id,'Cancelled','Staff diary entry: owner confirmation is not needed.');return null;
    end if;$patch$;
 if strpos(definition,needle)=0 then raise exception 'Unexpected booking email prepare foundation.';end if;
 execute replace(definition,needle,replacement);
end$migration$;
-- Cancel old unsent jobs too. Already delivered messages keep their real history.
do $$declare job record;begin
 for job in select id from jovabook_private.email_queue q where q.audience='owner' and q.kind='confirmed' and q.status in('Queued','Scheduled','Sending') and q.provider_id is null
  and jovabook_private.suppress_owner_booking_confirmation(q.salon_id,q.booking_id)
 loop perform jovabook_private.record_email_status(job.id,'Cancelled','Staff diary entry: owner confirmation is not needed.');end loop;
end$$;
commit;
