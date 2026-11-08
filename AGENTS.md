<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Hero and social sharing

- Whenever the marketing hero changes, refresh the Open Graph and X share image and text in the same PR. Use a new versioned image URL.
- Keep homepage metadata and shared metadata on `lib/social-preview.mjs`. Refresh the source hashes in `public/share/social-preview-manifest.json` using the local capture workflow in `scripts/capture-jovabook-share.mjs`.
- Inspect the actual local share image and mobile layout. Do not load production pages, trigger tracking clicks, or run live regression/performance/crawl tests for this check.
