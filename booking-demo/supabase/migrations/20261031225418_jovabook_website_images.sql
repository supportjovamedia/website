-- Public marketing images only. Every upload gets a fresh immutable object path.
begin;
do $$begin
 if exists(select 1 from storage.buckets where id='jovabook-website-images') then
  raise exception 'Website image bucket already exists. Review it before applying this migration.';
 end if;
 if not exists(select 1 from pg_class where oid='storage.objects'::regclass and relrowsecurity) then
  raise exception 'Storage object row level security must already be enabled.';
 end if;
end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('jovabook-website-images','jovabook-website-images',true,5242880,array['image/jpeg','image/png','image/webp']);

create policy "website images owner insert" on storage.objects for insert to authenticated
with check(bucket_id='jovabook-website-images'
 and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
 and exists(select 1 from public.salons s where s.id::text=split_part(name,'/',1) and s.owner_id=(select auth.uid())));
create policy "website images owner select" on storage.objects for select to authenticated
using(bucket_id='jovabook-website-images'
 and exists(select 1 from public.salons s where s.id::text=split_part(name,'/',1) and s.owner_id=(select auth.uid())));

-- A permissive policy added elsewhere cannot widen this bucket's tenant boundary.
-- Public URL downloads bypass SELECT policies by Storage design; listings do not.
create policy "website images tenant boundary" on storage.objects as restrictive for all to public
using(bucket_id<>'jovabook-website-images' or (
 name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
 and exists(select 1 from public.salons s where s.id::text=split_part(name,'/',1) and s.owner_id=(select auth.uid()))))
with check(bucket_id<>'jovabook-website-images' or (
 name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
 and exists(select 1 from public.salons s where s.id::text=split_part(name,'/',1) and s.owner_id=(select auth.uid()))));
create policy "website images no owner overwrite" on storage.objects as restrictive for update to public
using(bucket_id<>'jovabook-website-images') with check(bucket_id<>'jovabook-website-images');
create policy "website images no owner deletion" on storage.objects as restrictive for delete to public
using(bucket_id<>'jovabook-website-images');
commit;
