begin;
-- A trial can retain access while its subscription is already set not to renew.
do $migration$
declare definition text;needle text;begin
 definition:=pg_get_functiondef('jovabook_private.operator_business_record(uuid)'::regprocedure);
 needle:='when a.trial_ends_at>now() then ''trial''';
 if strpos(definition,needle)=0 then raise exception 'Unexpected operator business status foundation.';end if;
 execute replace(definition,needle,'when coalesce(a.cancel_at_period_end,false) then ''trial_cancelled'' when a.trial_ends_at>now() then ''trial''');
 definition:=pg_get_functiondef('public.operator_overview()'::regprocedure);
 needle:='a.trial_ends_at>now()),';
 if strpos(definition,needle)=0 then raise exception 'Unexpected operator trial counts foundation.';end if;
 execute replace(definition,needle,'a.trial_ends_at>now() and not coalesce(a.cancel_at_period_end,false)), ''trials_cancelled'',count(*) filter(where not a.ever_paid and a.trial_started_at is not null and a.cancel_at_period_end),');
end$migration$;
notify pgrst,'reload schema';
commit;
