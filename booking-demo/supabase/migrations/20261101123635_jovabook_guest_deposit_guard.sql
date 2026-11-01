-- No hosted guest capture writer exists. Editable deposit settings must never
-- manufacture a paid-looking booking or public.payments row.
begin;

-- Copy the full current horizon/billing call chain without moving or replacing
-- its public entrypoint identity. CREATE OR REPLACE preserves its owner and ACL.
do $$declare definition text;
begin
 definition:=pg_get_functiondef('public.create_booking(text,text,text,text,text,text,text,text,text,text)'::regprocedure);
 execute replace(definition,'public.create_booking(','jovabook_private.deposit_original_create_booking(');
end$$;
revoke all on function jovabook_private.deposit_original_create_booking(text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;

create or replace function public.create_booking(p_slug text,p_service text,p_staff text,p_date text,p_time text,p_name text,p_email text,p_phone text,p_notes text,p_method text default 'Card') returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare salon public.salons;service public.services;enabled boolean;configured numeric;required_deposit numeric;
begin
 select * into salon from public.salons where slug=lower(trim(p_slug));
 if salon.id is null then return null;end if;
 -- Same lock order as other canonical booking writers. Recheck the slug after
 -- acquiring the owner lock, so a concurrent rename cannot delegate to a new
 -- business that inherited that address. Missing/locked scopes fail as before.
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||salon.id::text));
 select * into salon from public.salons where id=salon.id and slug=lower(trim(p_slug)) for share nowait;
 if salon.id is null or not jovabook_private.billing_open(salon.id) then return null;end if;
 -- Row-share locks freeze payment settings and service price through the
 -- delegated insert. NOWAIT avoids waiting behind legacy update lock ordering.
 if salon.status in('trialing','active') then
  select * into service from public.services where salon_id=salon.id and id=p_service for share nowait;
  if service.id is null then return jsonb_build_object('ok',false,'message','Choose a valid service.');end if;
   begin
    enabled:=coalesce((salon.payments->>'enabled')::boolean,false);
    if enabled then
     configured:=coalesce((salon.payments->>'deposit')::numeric,0);
     if configured<0 or configured::text in('NaN','Infinity','-Infinity') then
      return jsonb_build_object('ok',false,'code','online_deposit_unavailable','message','Online booking payments are unavailable. Please contact the business to book.');
     end if;
     required_deposit:=least(configured,service.price);
     if required_deposit>0 then
      return jsonb_build_object('ok',false,'code','online_deposit_unavailable','message','Online booking with a required deposit is not available yet. Please contact the business to book.');
     end if;
    end if;
   exception when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok',false,'code','online_deposit_unavailable','message','Online booking payments are unavailable. Please contact the business to book.');
   end;
 end if;
 -- No method value, client flag or integration credential can bypass a required
 -- deposit. Allowed bookings retain every existing horizon/slot/billing check.
 return jovabook_private.deposit_original_create_booking(p_slug,p_service,p_staff,p_date,p_time,p_name,p_email,p_phone,p_notes,p_method);
exception when lock_not_available then
 return jsonb_build_object('ok',false,'code','booking_busy','message','Booking details are being updated. Please try again shortly or contact the business.');
end$$;

-- Leave public.create_booking permissions untouched. The SMS wrapper keeps its
-- existing request cache and calls this same public function for new requests.
commit;
