-- Stripe connections (deposits paid to the business) belong to paid plans. Starter is booking only.
create or replace function jovabook_private.integration_connect_allowed(p_salon uuid,p_provider text) returns boolean
language sql stable security definer set search_path='' as $$
 select jovabook_private.billing_open(p_salon) and
 (p_provider='stripe' and coalesce(jovabook_private.offer_plan(p_salon),'essential') in('standard','premium')
  or p_provider in('mailchimp','sms_works','twilio') and exists(
  select 1 from jovabook_private.billing_accounts where salon_id=p_salon and ever_paid and paid_plan in('standard','premium')))
$$;
revoke all on function jovabook_private.integration_connect_allowed(uuid,text) from public,anon,authenticated;
