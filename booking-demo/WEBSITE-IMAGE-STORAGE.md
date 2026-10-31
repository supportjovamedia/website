# Website image storage

The website hero uses public marketing images. Customer records, intake answers, email activity and private business data remain outside this bucket.

## Implementation contract

`directory.uploadWebsiteImage(file, salonId)` returns `{ok:true,url,path,bucket}` after a successful authenticated Storage POST, or `{ok:false,message,...}`. Error flags can include `status`, `network`, `auth`, `unavailable`, `stale` and `invalidTenant`. The frontend keeps its existing saved hero on failure. A successful upload alone does not save the website settings.

The caller first resizes and re-encodes the image through Canvas, stripping original metadata. The account adapter independently accepts only JPEG, PNG and WebP with matching magic bytes, a nonzero actual length and a maximum of 5,242,880 bytes. The declared length must match the bytes read. It verifies the current server-discovered owner/salon scope before file reading, after asynchronous reading, after token acquisition and after the upload response. A changed account/session response is discarded.

Uploads use only the configured public API key plus the current owner access token. There is no service key in browser code. Every POST uses `x-upsert:false` and a fresh path:

`<salonUUID>/<randomUUID>.(jpg|png|webp)`

`directory.safeWebsiteImage(url, salonId)` returns a canonical URL or an empty string. It accepts only HTTPS URLs on the configured Supabase project origin, under `/storage/v1/object/public/jovabook-website-images/<salonUUID>/`, with the exact fresh filename pattern. Credentials, query strings, fragments, alternate prefixes, extra directories, backslashes, encoded path characters and traversal are rejected. Public renderers validate against the salon ID in the public response, rather than an owner cache.

Built-in Demo image previews are a separate frontend IndexedDB/blob flow. The remote adapter does not accept demo image references, blob URLs or data URLs as hosted image URLs.

## Migration

`supabase/migrations/20261031225418_jovabook_website_images.sql` was created with Supabase CLI 2.122.0 using `supabase migration new jovabook_website_images --workdir .`. A disposable PostgreSQL prototype passed before its SQL was copied into the generated file.

The migration creates one previously absent, empty bucket named `jovabook-website-images`, marked public, with an exact 5 MiB limit and the three allowed MIME types. It fails rather than altering a bucket that already has this ID. Other buckets are neither created nor changed.

Five policies apply only to this bucket:

- Authenticated INSERT and SELECT require a salon owned by `auth.uid()` and the matching UUID prefix.
- A restrictive tenant boundary also validates the complete filename/path. It prevents unrelated permissive policies from widening this bucket's access through policy OR semantics.
- Restrictive UPDATE and DELETE guards retain existing image objects and prevent overwrites, moves and owner deletion, including when a broad permissive policy exists elsewhere.

No custom functions or tables are created inside Supabase-managed schemas. No role privileges, existing policies or RLS enablement are changed. The migration requires object RLS to be enabled already.

Public Storage URL downloads deliberately bypass SELECT policies. Anyone with a marketing image URL can view it. Anonymous Storage listings and authenticated cross-business listings remain denied. Business/customer table RLS is unchanged. Old objects remain available after a replacement or a stale upload response; no destructive cleanup is performed by this feature.

## Verification and boundaries

Production metadata was inspected read-only before implementation: no buckets or Storage object policies existed, and `storage.objects` had RLS enabled. The migration was applied to the live JovaBook project on 31 October 2026. Read-only verification confirmed the public bucket, the 5 MiB limit, the three permitted MIME types, all five policies, object RLS enabled and zero stored objects. No hosted Auth user, salon or test image was created.

Run the focused checks:

```powershell
node --test booking-demo/tests/website-images.mjs booking-demo/tests/website-images-sql.mjs booking-demo/tests/data-isolation-audit.mjs
```

The 36 passing tests cover client MIME/size/signature validation, unique binary POSTs, URL adversarial inputs, network/provider errors, token refresh and stale-session rejection, plus actual disposable PostgreSQL RLS evaluation for two owners and anonymous access. RLS tests deliberately add a hostile global permissive policy and verify the restrictive boundaries still prevent cross-business access and image mutation. An unrelated private bucket retains its previous semantics.

The SQL harness models managed Storage metadata tables and uses actual PostgreSQL roles/policies. It does not run the Supabase Storage HTTP server or object store. Bucket MIME/size settings are verified as metadata; HTTP enforcement and public asset delivery are specified by current official Storage documentation and have not been exercised against a hosted object. The adapter HTTP tests use intercepts, not real JWT uploads.

After root review and application, execute `supabase/website_images_readiness.sql` read-only. Expect one public bucket, size 5242880, MIME types JPEG/PNG/WebP, all five policies and RLS enabled. A newly applied bucket has zero objects. Review every existing object policy, including policies added since the initial inspection. A hosted upload/download roundtrip requires separately authorized temporary test fixtures; it has not been claimed as passing here.

## Current documentation checked

Reviewed on 31 October 2026 using Supabase MCP documentation search and official markdown pages:

- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Public and private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Bucket restrictions](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
- [Standard uploads and fresh paths](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [File limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Changelog index](https://supabase.com/changelog.md)

Relevant changelog entries were followed: the managed-schema restrictions still explicitly permit Storage policies, and the November 2026 TLS cipher removal affects obsolete clients rather than modern browser fetch. The design uses managed bucket metadata and RLS policies, without adding custom managed-schema objects.

The pre-change security advisor baseline contains existing notices for private email tables with RLS and no policies, `pg_net` in `public`, and callable SECURITY DEFINER application RPCs. These are outside this bucket-only change. No Storage policy finding existed before implementation. This check does not claim those pre-existing notices have been resolved. See the official [extension placement](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) and [callable SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) advisor guidance for separate review.
