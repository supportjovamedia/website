-- Qualify the outer Storage object path. The real salons table also has a name
-- column, which otherwise shadows unqualified name references inside EXISTS.
begin;
drop policy "website images owner insert" on storage.objects;
drop policy "website images owner select" on storage.objects;
drop policy "website images tenant boundary" on storage.objects;

create policy "website images owner insert" on storage.objects for insert to authenticated
with check(storage.objects.bucket_id='jovabook-website-images'
 and storage.objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
 and exists(select 1 from public.salons s where s.id::text=split_part(storage.objects.name,'/',1) and s.owner_id=(select auth.uid())));
create policy "website images owner select" on storage.objects for select to authenticated
using(storage.objects.bucket_id='jovabook-website-images'
 and exists(select 1 from public.salons s where s.id::text=split_part(storage.objects.name,'/',1) and s.owner_id=(select auth.uid())));

create policy "website images tenant boundary" on storage.objects as restrictive for all to public
using(storage.objects.bucket_id<>'jovabook-website-images' or (
 storage.objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
 and exists(select 1 from public.salons s where s.id::text=split_part(storage.objects.name,'/',1) and s.owner_id=(select auth.uid()))))
with check(storage.objects.bucket_id<>'jovabook-website-images' or (
 storage.objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
 and exists(select 1 from public.salons s where s.id::text=split_part(storage.objects.name,'/',1) and s.owner_id=(select auth.uid()))));
-- The existing restrictive no-overwrite and no-deletion policies stay in place.
commit;
