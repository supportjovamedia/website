-- PARAMETERIZED TEMPLATE ONLY, not a migration and not executed by the app.
-- Bind $1 = SHA-256 hex digest of JOVABOOK_SMS_WORKER_TOKEN, computed on the server.
-- Bind $2 = approved branded sender ID (3..11 alphanumeric characters).
-- Never bind the provider JWT or service-role key. Neither belongs in SQL.
-- Run through a parameterized SQL client after reviewing the migration.
update jovabook_private.sms_config
set enabled=false,provider_configured=false,
 worker_token_hash=case when $1::text ~ '^[0-9a-f]{64}$' then $1::text else null end,
 sender=case when $2::text ~ '^[A-Za-z0-9]{3,11}$' then $2::text else null end,
 monthly_segment_limit=null,max_segments_per_message=null
where singleton;
-- Missing business rows remain implicitly disabled and unconfigured.
-- There is intentionally no enable statement, allowance or cron in this template.
