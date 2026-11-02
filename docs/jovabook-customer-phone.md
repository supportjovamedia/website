# Optional customer phone

`customer_portal_register(p_slug,p_first_name,p_last_name,p_phone default '')` accepts an omitted, null, empty or whitespace-only phone and stores `''`. No placeholder number is created. A supplied phone is trimmed and must contain 7 to 40 characters. Membership rows keep a non-null text column with an empty-string default and the same maximum length.

First and last names remain required, trimmed and limited to 60 characters each. Apostrophes, hyphens, spaces and non-Latin characters are accepted. Confirmed email, exclusive customer role, business availability, tenant membership and cancellation rules are unchanged. Existing business client records are not overwritten with registration values.

The new SQL migration and full-schema isolated test are `20261102153041_customer_phone_optional.sql` and `booking-demo/tests/customer-phone-optional-sql.mjs`. They do not modify hosted Auth, send messages or activate payments.
