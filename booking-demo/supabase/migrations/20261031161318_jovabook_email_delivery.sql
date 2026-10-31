-- Email state is produced by committed booking changes, never by browser payloads.
-- No existing booking or email is backfilled or sent by this migration.
create schema if not exists jovabook_private;
revoke all on schema jovabook_private from public, anon, authenticated;

create table jovabook_private.email_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  worker_token_hash text,
  webhook_secret text,
  webhook_id text,
  sender text not null default 'bookings@jovamedia.com',
  public_url text not null default 'https://book.jovamedia.com',
  reminder_hours integer not null default 24 check (reminder_hours=24)
);
insert into jovabook_private.email_config(singleton) values(true);
alter table jovabook_private.email_config enable row level security;

alter table public.email_log add column owner_status text not null default '';
alter table public.email_log add column scheduled_at timestamptz;
alter table public.email_log add column updated_at timestamptz not null default now();
create index email_log_updated_idx on public.email_log(salon_id,updated_at desc);
revoke insert,update,delete on public.email_log from anon,authenticated;
grant select on public.email_log to authenticated;

create table jovabook_private.email_queue (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  event_id text not null,
  booking_id text not null,
  audience text not null check(audience in ('customer','owner')),
  recipient text not null,
  kind text not null check(kind in ('confirmed','rescheduled','cancelled','reminder')),
  booking_revision text not null,
  payload jsonb not null,
  provider_payload jsonb,
  due_at timestamptz not null,
  status text not null default 'Queued' check(status in ('Queued','Scheduled','Sending','Sent','Delivered','Failed','Bounced','Suppressed','Cancelled')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  lease_id uuid,
  lease_until timestamptz,
  provider_id text,
  last_error text,
  provider_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(salon_id,event_id,audience),
  foreign key(salon_id,event_id) references public.email_log(salon_id,id) on delete cascade
);
create index email_queue_due_idx on jovabook_private.email_queue(due_at) where status in ('Queued','Scheduled','Sending');
create unique index email_queue_provider_idx on jovabook_private.email_queue(provider_id) where provider_id is not null;
alter table jovabook_private.email_queue enable row level security;
create table jovabook_private.email_webhook_events (
  id text primary key,
  provider_id text not null,
  event_type text not null,
  event_at timestamptz not null,
  processed boolean not null default false,
  received_at timestamptz not null default now()
);
alter table jovabook_private.email_webhook_events enable row level security;
create table jovabook_private.email_probes (
  provider_id text primary key,
  expected text not null check(expected in ('Delivered','Bounced')),
  status text not null default 'Sent',
  created_at timestamptz not null default now()
);
alter table jovabook_private.email_probes enable row level security;

create function jovabook_private.booking_email_revision(b public.bookings) returns text
language sql immutable set search_path='' as $$
  select md5(jsonb_build_array(b.salon_id,b.id,b.status,b.date,b.time,b.staff_id,b.service_id,b.service_name,b.duration,b.price,b.name,lower(b.email))::text)
$$;

create function jovabook_private.record_email_status(p_id uuid,p_status text,p_error text default null)
returns void language plpgsql set search_path='' as $$
declare q jovabook_private.email_queue;
begin
  update jovabook_private.email_queue set status=p_status,last_error=left(p_error,300),updated_at=now()
  where id=p_id returning * into q;
  if q.id is null then return; end if;
  if q.audience='customer' then
    update public.email_log set status=p_status,updated_at=now() where salon_id=q.salon_id and id=q.event_id;
  else
    update public.email_log set owner_status=p_status,updated_at=now() where salon_id=q.salon_id and id=q.event_id;
  end if;
end $$;

create function jovabook_private.apply_email_event(p_id text) returns boolean
language plpgsql set search_path='' as $$
declare e jovabook_private.email_webhook_events; q jovabook_private.email_queue; item record; state text;
begin
  select * into e from jovabook_private.email_webhook_events where id=p_id for update;
  if e.id is null or e.processed then return false; end if;
  state:=case e.event_type when 'email.delivered' then 'Delivered' when 'email.bounced' then 'Bounced'
    when 'email.complained' then 'Suppressed' when 'email.suppressed' then 'Suppressed' when 'email.failed' then 'Failed' else null end;
  select * into q from jovabook_private.email_queue where provider_id=e.provider_id for update;
  if q.id is null then
    update jovabook_private.email_probes set status=coalesce(state,status) where provider_id=e.provider_id;
    if found then update jovabook_private.email_webhook_events set processed=true where id=e.id;return true; end if;
    return false;
  end if;
  if state is not null and (q.provider_event_at is null or e.event_at>=q.provider_event_at)
    and not(q.status in ('Bounced','Suppressed') and state='Delivered') then
    update jovabook_private.email_queue set provider_event_at=e.event_at where id=q.id;
    perform jovabook_private.record_email_status(q.id,state);
  end if;
  if state in ('Bounced','Suppressed') then
    for item in select id from jovabook_private.email_queue where lower(recipient)=lower(q.recipient) and status in ('Queued','Scheduled') loop
      perform jovabook_private.record_email_status(item.id,'Suppressed','Recipient cannot receive email.');
    end loop;
  end if;
  update jovabook_private.email_webhook_events set processed=true where id=e.id;
  return true;
end $$;

create function jovabook_private.enqueue_booking_email(b public.bookings,p_kind text,p_due timestamptz)
returns void language plpgsql set search_path='' as $$
declare s public.salons; event text; revision text; subject text; initial text; snap jsonb; data jsonb; addr text; audience text; jid uuid;
begin
  select * into s from public.salons where id=b.salon_id;
  if s.id is null then return; end if;
  revision:=jovabook_private.booking_email_revision(b);
  -- A reminder for the same date/time/customer is not re-created by an unrelated edit.
  event:='mail_'||replace(gen_random_uuid()::text,'-','');
  initial:=case when p_due>now() then 'Scheduled' else 'Queued' end;
  subject:=case p_kind when 'confirmed' then 'Booking confirmed' when 'rescheduled' then 'Booking updated' when 'cancelled' then 'Booking cancelled' else 'Your booking is tomorrow' end;
  snap:=public.booking_json(b);
  data:=jsonb_build_object('business',s.name,'slug',s.slug,'address',s.address,'phone',s.phone,'reply_to',s.email,
    'color',coalesce(s.settings->>'color','#77504e'),'booking',snap,'kind',p_kind,
    'staff_name',(select name from public.staff where salon_id=b.salon_id and id=b.staff_id),
    'timezone','Europe/London');
  insert into public.email_log(salon_id,id,kind,subject,to_email,from_email,reply_to,salon_name,address,booking,status,owner_status,scheduled_at)
  values(s.id,event,p_kind,s.name||': '||subject,b.email,'JovaBook <bookings@jovamedia.com>',coalesce(s.email,''),s.name,coalesce(s.address,''),snap,
    case when coalesce(b.email,'')~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then initial else 'Failed' end,
    case when p_kind='reminder' then '' when coalesce(s.email,'')~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then initial else 'Failed' end,
    case when p_kind='reminder' then p_due else null end);
  foreach audience in array case when p_kind='reminder' then array['customer'] else array['customer','owner'] end loop
    addr:=case audience when 'customer' then b.email else s.email end;
    if coalesce(addr,'')!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then continue; end if;
    insert into jovabook_private.email_queue(salon_id,event_id,booking_id,audience,recipient,kind,booking_revision,payload,due_at,status)
    values(s.id,event,b.id,audience,addr,p_kind,revision,data||jsonb_build_object('audience',audience),p_due,initial) returning id into jid;
    if exists(select 1 from jovabook_private.email_queue where lower(recipient)=lower(addr) and status in ('Bounced','Suppressed')) then
      perform jovabook_private.record_email_status(jid,'Suppressed','Recipient cannot receive email.');
    end if;
  end loop;
end $$;

create function jovabook_private.booking_email_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare q record; b public.bookings; event_kind text; starts_at timestamptz; reminder_at timestamptz;
begin
  if TG_OP='UPDATE' and (new.id<>old.id or new.salon_id<>old.salon_id) then
    raise exception 'A booking identity cannot be changed.' using errcode='23514';
  end if;
  if TG_OP='UPDATE' and jovabook_private.booking_email_revision(new)=jovabook_private.booking_email_revision(old) then return new; end if;
  b:=case when TG_OP='DELETE' then old else new end;
  -- Never send pending confirmations or reminders describing an obsolete booking.
  for q in select id from jovabook_private.email_queue where salon_id=b.salon_id and booking_id=b.id and status in ('Queued','Scheduled','Sending') loop
    perform jovabook_private.record_email_status(q.id,'Cancelled','Booking changed before this email was sent.');
  end loop;
  if TG_OP='DELETE' then
    -- Deleting a mistaken record is distinct from cancelling a customer booking.
    -- Preserve the existing owner confirmation: deletion sends no new message.
    return old;
  elsif new.status='cancelled' and (TG_OP='INSERT' or old.status is distinct from new.status) then event_kind:='cancelled';
  elsif new.status='confirmed' then event_kind:=case when TG_OP='INSERT' then 'confirmed' else 'rescheduled' end;
  else return new;
  end if;
  perform jovabook_private.enqueue_booking_email(b,event_kind,now());
  if b.status='confirmed' then
    starts_at:=(b.date+b.time::time) at time zone 'Europe/London';
    reminder_at:=starts_at-interval '24 hours';
    -- A booking made within 24 hours gets its confirmation, not an immediate duplicate reminder.
    if reminder_at>now()+interval '5 minutes' then perform jovabook_private.enqueue_booking_email(b,'reminder',reminder_at); end if;
  end if;
  return case when TG_OP='DELETE' then old else new end;
end $$;
create trigger jovabook_email_events after insert or update or delete on public.bookings
for each row execute function jovabook_private.booking_email_event();

-- Legacy public booking RPCs still call this. The trigger owns generation now.
create or replace function public.add_mail(p_salon uuid,p_kind text,p_booking jsonb) returns void
language plpgsql security definer set search_path='' as $$ begin return; end $$;
revoke all on function public.add_mail(uuid,text,jsonb) from public,anon,authenticated;

create function public.email_delivery_info() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if public.my_salon_id() is null then raise exception 'Sign in to view email delivery.' using errcode='42501'; end if;
  return (select jsonb_build_object('enabled',enabled,'provider','Resend','reminder_hours',reminder_hours) from jovabook_private.email_config where singleton);
end $$;
revoke all on function public.email_delivery_info() from public,anon;
grant execute on function public.email_delivery_info() to authenticated;

-- Narrow server API, protected by a random 256-bit secret, instead of giving the
-- web application a project-wide service-role key. The schema itself is private.
create function public.booking_email_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg jovabook_private.email_config; q jovabook_private.email_queue; b public.bookings; result jsonb:='[]';
  item record; chosen uuid; lease uuid; state text; provider text; event_type text; event_time timestamptz; affected integer; safe text;
begin
  select * into cfg from jovabook_private.email_config where singleton;
  if p_token is null or length(p_token)<>64 or cfg.worker_token_hash is null
    or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>cfg.worker_token_hash then
    raise exception 'Invalid email worker credentials.' using errcode='42501';
  end if;
  if p_action='health' then
    return jsonb_build_object('enabled',cfg.enabled,'provider','Resend','sender',cfg.sender,'public_url',cfg.public_url,
      'webhook_configured',cfg.webhook_secret is not null,'queued',(select count(*) from jovabook_private.email_queue where status in ('Queued','Scheduled','Sending')),
      'failed',(select count(*) from jovabook_private.email_queue where status='Failed'),
      'probes',(select coalesce(jsonb_agg(jsonb_build_object('expected',expected,'status',status)),'[]') from jovabook_private.email_probes where created_at>now()-interval '1 day'));
  elsif p_action='config' then
    return jsonb_build_object('enabled',cfg.enabled,'sender',cfg.sender,'public_url',cfg.public_url,'webhook_secret',cfg.webhook_secret,'webhook_id',cfg.webhook_id);
  elsif p_action='webhook_config' then
    if coalesce(p_payload->>'secret','')!~'^whsec_[A-Za-z0-9+/=_-]{16,200}$' then raise exception 'Invalid webhook secret.' using errcode='23514'; end if;
    update jovabook_private.email_config set webhook_secret=p_payload->>'secret',webhook_id=left(p_payload->>'id',100) where singleton;
    return jsonb_build_object('ok',true);
  elsif p_action='claim' then
    if not cfg.enabled then return '[]'; end if;
    for q in select * from jovabook_private.email_queue where status in ('Queued','Scheduled','Sending')
      and due_at<=now() and (lease_until is null or lease_until<now()) order by due_at,id for update skip locked limit 5 loop
      if q.attempts>=8 or (q.first_attempt_at is not null and q.first_attempt_at<now()-interval '22 hours') then
        perform jovabook_private.record_email_status(q.id,'Failed','Retry window expired. Delivery needs review.');continue;
      end if;
      select * into b from public.bookings where salon_id=q.salon_id and id=q.booking_id;
      if (q.kind='cancelled' and b.id is not null and b.status<>'cancelled')
        or (q.kind<>'cancelled' and (b.id is null or b.status<>'confirmed' or jovabook_private.booking_email_revision(b)<>q.booking_revision))
        or (q.kind='reminder' and (b.date+b.time::time) at time zone 'Europe/London'<=now()) then
        perform jovabook_private.record_email_status(q.id,'Cancelled','This email no longer matches the current booking.');continue;
      end if;
      lease:=gen_random_uuid();
      update jovabook_private.email_queue set attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),lease_id=lease,
        lease_until=now()+interval '5 minutes',updated_at=now() where id=q.id;
      perform jovabook_private.record_email_status(q.id,'Sending');
      result:=result||jsonb_build_array(jsonb_build_object('id',q.id,'lease',lease,'payload',q.payload,'recipient',q.recipient,
        'provider_payload',q.provider_payload,'kind',q.kind,'audience',q.audience));
    end loop;
    return result;
  elsif p_action='prepare' then
    -- Persist the exact provider request before the first attempt. Retries must
    -- reuse identical content as well as the provider idempotency key.
    if not cfg.enabled then return null; end if;
    update jovabook_private.email_queue set provider_payload=coalesce(provider_payload,p_payload->'mail')
    where id=(p_payload->>'id')::uuid and lease_id=(p_payload->>'lease')::uuid and status='Sending' and lease_until>now()
    returning provider_payload into result;
    if result is not null then
      update public.email_log e set from_email=coalesce(result->>'from',e.from_email),updated_at=now()
      from jovabook_private.email_queue queued where queued.id=(p_payload->>'id')::uuid and queued.audience='customer' and e.salon_id=queued.salon_id and e.id=queued.event_id;
    end if;
    return result;
  elsif p_action='finish' then
    provider:=nullif(p_payload->>'provider_id','');
    if provider is not null then perform pg_advisory_xact_lock(hashtext('jovabook-email-provider'),hashtext(provider)); end if;
    select * into q from jovabook_private.email_queue where id=(p_payload->>'id')::uuid and lease_id=(p_payload->>'lease')::uuid for update;
    if q.id is null or q.status not in ('Sending','Cancelled') then return jsonb_build_object('ok',true,'stale',true); end if;
    if provider is not null then
      update jovabook_private.email_queue set provider_id=provider,lease_until=null where id=q.id;
      perform jovabook_private.record_email_status(q.id,'Sent');
      for item in select id from jovabook_private.email_webhook_events where provider_id=provider and not processed order by event_at loop
        perform jovabook_private.apply_email_event(item.id);
      end loop;
    elsif q.status='Cancelled' then return jsonb_build_object('ok',true,'stale',true);
    elsif coalesce((p_payload->>'retry')::boolean,false) and q.attempts<8 then
      update jovabook_private.email_queue set due_at=now()+make_interval(secs=>least(3600,60*power(2,q.attempts)::integer)),lease_until=null where id=q.id;
      perform jovabook_private.record_email_status(q.id,'Queued',left(p_payload->>'error',300));
    else
      update jovabook_private.email_queue set lease_until=null where id=q.id;
      perform jovabook_private.record_email_status(q.id,'Failed',left(p_payload->>'error',300));
    end if;
    return jsonb_build_object('ok',true);
  elsif p_action='event' then
    if length(coalesce(p_payload->>'event_id','')) not between 1 and 200 then raise exception 'Invalid event.'; end if;
    provider:=p_payload->>'provider_id';
    perform pg_advisory_xact_lock(hashtext('jovabook-email-provider'),hashtext(provider));
    insert into jovabook_private.email_webhook_events(id,provider_id,event_type,event_at)
      values(p_payload->>'event_id',provider,p_payload->>'type',(p_payload->>'at')::timestamptz) on conflict do nothing;
    get diagnostics affected=row_count;
    if affected=0 then return jsonb_build_object('ok',true,'duplicate',true,'matched',jovabook_private.apply_email_event(p_payload->>'event_id')); end if;
    return jsonb_build_object('ok',true,'matched',jovabook_private.apply_email_event(p_payload->>'event_id'));
  elsif p_action='probe' then
    if p_payload->>'expected' not in ('Delivered','Bounced') then raise exception 'Invalid probe.'; end if;
    insert into jovabook_private.email_probes(provider_id,expected) values(p_payload->>'provider_id',p_payload->>'expected') on conflict do nothing;
    for item in select id from jovabook_private.email_webhook_events where provider_id=p_payload->>'provider_id' and not processed order by event_at loop
      perform jovabook_private.apply_email_event(item.id);
    end loop;
    return jsonb_build_object('ok',true);
  else raise exception 'Unknown email operation.' using errcode='23514';
  end if;
end $$;
revoke all on all tables in schema jovabook_private from public,anon,authenticated;
revoke all on all functions in schema jovabook_private from public,anon,authenticated;
revoke all on function public.booking_email_worker(text,text,jsonb) from public;
grant execute on function public.booking_email_worker(text,text,jsonb) to anon;
