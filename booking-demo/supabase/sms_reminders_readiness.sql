-- Read-only, no provider call and no secrets/phone numbers/message content returned.
select enabled,provider_configured,
 coalesce(worker_token_hash ~ '^[0-9a-f]{64}$',false) as worker_key_hash_configured,
 sender is not null as sender_configured,
 monthly_segment_limit,max_segments_per_message
from jovabook_private.sms_config where singleton;
select s.id,s.plan,coalesce(p.enabled,false) as business_enabled,
 p.monthly_segment_limit,p.max_segments_per_message,
 jovabook_private.sms_timezone(s.id) as validated_timezone,
 jovabook_private.sms_available(s.id) as effectively_enabled
from public.salons s left join jovabook_private.sms_business_settings p on p.salon_id=s.id;
select status,count(*) from jovabook_private.sms_queue group by status order by status;
select scope,month,reserved_segments from jovabook_private.sms_usage order by month,scope;
select proname,pg_get_function_identity_arguments(oid) as signature
from pg_proc where pronamespace='public'::regnamespace and proname in('create_booking','create_booking_with_sms');
select relname,relrowsecurity from pg_class
where relnamespace='jovabook_private'::regnamespace and relname like 'sms_%';
