-- Read-only deployment verification. Does not create users, salons or images.
select id,public,file_size_limit,allowed_mime_types from storage.buckets
where id='jovabook-website-images';
select policyname,permissive,roles,cmd,qual,with_check from pg_policies
where schemaname='storage' and tablename='objects' order by policyname;
select relrowsecurity from pg_class where oid='storage.objects'::regclass;
select count(*) as website_image_objects from storage.objects
where bucket_id='jovabook-website-images';
