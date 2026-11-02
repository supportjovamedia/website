begin;
-- Operator identity is derived from the verified session; the worker key never reaches this API.
create function public.operator_commission_reviews(p_salon uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rows jsonb;total bigint;begin
 perform jovabook_private.require_operator();
 select count(*) into total from jovabook_private.commission_origins o
 where o.source='Online' and o.booking_id=o.root_booking_id and (p_salon is null or o.salon_id=p_salon)
 and (o.decision='review' or exists(select 1 from jovabook_private.commission_entries e where e.salon_id=o.salon_id and e.booking_id=o.booking_id and e.review_required));
 select coalesce(jsonb_agg(item order by booked_at),'[]'::jsonb) into rows from (
 select o.booked_at,jsonb_build_object('salon_id',o.salon_id,'business',s.name,'booking_id',o.booking_id,'source',o.source,
 'original_price_minor',o.original_price_minor,'booked_at',o.booked_at,'original_start',o.original_start,'current_start',o.current_start,
 'terms_version',o.terms_version,'root_booking_id',o.root_booking_id,'decision',o.decision,
 'evidence',(select coalesce(jsonb_agg(jsonb_build_object('action',r.action,'reason',r.reason,'created_at',r.created_at,'evidence',r.evidence) order by r.created_at desc),'[]'::jsonb) from
 (select r.* from jovabook_private.commission_reviews r where r.salon_id=o.salon_id and
 (r.booking_id=o.booking_id or r.booking_id in(select linked.booking_id from jovabook_private.commission_origins linked where linked.salon_id=o.salon_id and linked.root_booking_id=o.booking_id)) order by r.created_at desc limit 8) r)) item
 from jovabook_private.commission_origins o join public.salons s on s.id=o.salon_id
 where o.source='Online' and o.booking_id=o.root_booking_id and (p_salon is null or o.salon_id=p_salon)
 and (o.decision='review' or exists(select 1 from jovabook_private.commission_entries e where e.salon_id=o.salon_id and e.booking_id=o.booking_id and e.review_required))
 order by o.booked_at limit 50) page;
 return jsonb_build_object('ok',true,'total',total,'reviews',rows);
end$$;
create function public.operator_commission_action(p_salon uuid,p_booking text,p_action text,p_reason text,p_decision text default null,p_replacement text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform jovabook_private.require_operator();
 if p_salon is null or length(trim(coalesce(p_booking,''))) not between 1 and 200 or length(trim(coalesce(p_reason,''))) not between 3 and 2000 then raise exception 'Select a booking and provide a review reason.';end if;
 if coalesce(p_action,'') not in('origin_review','origin_link') then raise exception 'Invalid commission review action.';end if;
 if p_action='origin_review' and coalesce(p_decision,'') not in('waived','chargeable') then raise exception 'Choose waive or chargeable.';end if;
 if p_action='origin_link' and (length(trim(coalesce(p_replacement,''))) not between 1 and 200 or p_replacement=p_booking) then raise exception 'Choose a different manual replacement booking.';end if;
 return jovabook_private.commission_origin_action(p_action,jsonb_build_object('salon',p_salon,'booking',p_booking,'reason',trim(p_reason),'actor',auth.uid(),'decision',p_decision,'replacement',p_replacement));
end$$;
revoke all on function public.operator_commission_reviews(uuid),public.operator_commission_action(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.operator_commission_reviews(uuid),public.operator_commission_action(uuid,text,text,text,text,text) to authenticated;
commit;
