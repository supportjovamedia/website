# Website polish follow-up

## Changes

- Homepage website previews now use all eight supplied desktop/mobile design images. Native picture sources choose one matching image per selected design. Visitors can scroll through the complete service/contact sections; image contents are non-clickable.
- User explicitly requested precise pixel editing. Removed the button arrows and Cobalt mobile header Book Now without regenerating mockups. Evergreen mobile's outer gutter is cropped. Original PNGs and edited PNGs remain in output/website-reference-originals for recovery.
- Script prepare-website-reference-images.mjs verifies that every source pixel outside the explicit edit rectangles remains unchanged before export. Original dimensions are checked before any edits. Quality-95 WebP exports retain original image resolution and total 1,452,002 bytes, compared with 7,991,158 bytes for lossless output. Metadata and provenance-marker checks pass for all eight delivery files.
- New assets have content-hashed URLs under the existing one-year immutable portal-image policy. No preloading of all designs, polling or recurring fetches is added.
- Homepage and /pricing now use one pricing markup source and one initializer, preserving current cadence, seats, total prices and signup destinations. Removed /pricing's region fetch. Shared homepage FAQ, background, typography and checklist styling apply to /pricing; the fixed-header offset is measured for phone/desktop.
- Resource, tips and blog pages have black typography and consistent controls. Visible breadcrumbs are removed while schema remains. Article photography is bounded to 840x320 desktop and up to 250px tall on phones, with full colour retained.
- Login has a true 2px outline with compensating padding and no extra inset stroke. Shared outlined controls gain a second inward pixel without changing their footprint.

## Validation

- All 16 design/device cases passed at 360, 390, 768 and 1440px: correct image source, full-width image, no filter/opacity fading, no clickable descendants, no overflow, and only the selected screen-sized asset requested per choice.
- Real wheel scrolling passed at 390 and 1440px.
- Local production build completed successfully. The production build was served locally on port4469; integrated gallery, pricing totals/annual switching/seat destinations and two industry pages passed at all four widths without browser errors.
- Four shared story runtime checks passed, including calculator arithmetic, effect replay, replaced pricing DOM and standalone pricing controls. Additional pricing unit/FAQ checks and computed parity checks passed. Pricing matches homepage across 16 compared selectors at 390, 768 and 1440px, with one H1, canonical preserved and ten FAQ schema entries.
- Five representative resource desktop routes and phone tips/article checks passed. Camera cover measured 840x320 desktop and354x215 phone, with no image filter. No breadcrumbs, horizontal overflow or browser exceptions.
- Focused ESLint and git diff checks passed. Browser checks blocked external requests; no live signup, payment, booking or outbound message was created.

## Release

This is a main-website change. No booking portal files, database schema, plan limits or payment processing logic change in this follow-up. User explicitly requested merge and release. Production CDN traffic investigation remains separately queued.
