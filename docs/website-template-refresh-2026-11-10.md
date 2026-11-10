# Website template refresh

## Implemented

- Replace the four current designs with Evergreen, Cobalt, Terracotta and Olive. Retain stored IDs `one-page`, `brightside`, `form` and `willow` so existing saved selections still resolve.
- Share one escaped renderer and one scoped stylesheet between the public portal and homepage showcase.
- Retain saved business names, headlines, descriptions, colours, uploaded images, contact details, hours and real tenant booking destinations.
- Add the service lists and prices shown in the references. Reveal additional services with View All Services.
- Use native mobile menu disclosures, a close icon, Escape and outside-click dismissal, and section navigation. Cobalt and Olive use sidebars on desktop.
- Remove decorative arrows. Underline the JovaMedia website credit on all four new designs, including paid accounts, as requested.
- Render real template miniatures in the dashboard instead of the old approximate thumbnail graphics. Add Preview selected design beside the choices without requiring a save.
- Keep all four picker thumbnails in a 390-pixel mobile layout. Use compact thumbnail-only spacing and a full-width crop through approximately the services section. Avoid fitting the entire page into the card, which made the previews too small. Selected-design dialogs also stay phone-sized on desktop. Public business websites retain their full content and responsive desktop layouts.
- Remove Cobalt's extra header Book Now action. Its main booking action and booking section remain available.
- Use existing project photographs for the fictional local demo and homepage example. Existing customer uploads remain intact. No new images were generated or added to services.
- Omit the location row if no address is saved.

## Validation

- 18 focused website, editor and asset-bundling tests passed.
- All four designs passed the real local portal flow at 390 and 1440 pixels: choose, save, reload, preview, image loading, mobile menu open/close/Escape, section navigation, expand services, credit destination and underline, and no horizontal overflow or browser exceptions.
- A website booking action opened the local customer service-selection flow. No booking, payment, message or live account was created.
- Targeted homepage component ESLint passed. The local Next homepage compiled and rendered the shared showcase.
- The owner production bundle still has three hashed application assets plus its runtime configuration. The new renderer and CSS are included in the existing bundles.
- Browser checks blocked external requests. This verification did not crawl production or spend Vercel CDN requests.
- The two reused WebP photographs have no EXIF, XMP or ICC metadata reported by Sharp. Source originals remain in the project.

## Release scope and remaining limits

- The user approved all four designs. Homepage Evergreen uses an existing treatment photo with white heading text; public customers retain their own uploaded images. Homepage samples are inert scrollable visuals, with only their external design selectors interactive. Redundant example labels are removed.
- Only mobile/narrow references were provided for Evergreen and Terracotta. Their desktop layouts adapt the same design; Cobalt and Olive have supplied desktop references.
- Team copy now specifies booking-page branding removal. All four new website templates retain the underlined JovaMedia credit. Plan prices, limits and billing entitlements are unchanged.
- Mobile-only and online-only businesses may save a blank address in Business information and setup. Physical, mixed and legacy/unknown choices retain address validation. The existing access response carries the requirement, adding no polling or requests. Phone, owner and paid-signup guards remain enforced. Both migrations were applied and their hosted grants and constraints verified.
- PRs 199 and 200 are included by merge, covering service descriptions, existing booking notes as Special instructions, calendar presentation, selector/FAQ fixes and yellow testimonial text.
- Calendar, Services, Clients and Insights now use new 2x lossless WebP screenshots on phone and desktop. Every RGB pixel matches the original PNG; captures use #FFD700. Metadata was stripped and originals preserved under output/product-screens-refresh.
- Pricing and industry templates use black text and buttons, consistent card edges and yellow accents. Pricing Team-seat totals and signup destinations now use the same selected quantity.
- No real payment, outbound message or live customer booking was created during validation. Service-specific midnight-only availability and overnight appointments are not added by this release.

Local review entry: `http://127.0.0.1:4466/?preview=day#scheduling`, then Website design. The temporary four-design gallery is a local review artifact and is not part of the release.

## Final release checks

- 81 focused checks passed across the final runs. Two asset tests initially encountered local sandbox EPERM reads; all three bundle tests passed when rerun with filesystem access.
- Four real address form modes passed save/reload or required-field checks. The database tests cover all 67 schema layers, private helper grants and paid-signup guards.
- New homepage preview, pricing-seat totals, monthly/yearly switching and two industry pages passed at 360, 390, 768 and 1440 pixels without overflow or browser exceptions.
- FAQ and selector runtime checks passed on mobile and desktop.
- Full local production build completed with webpack, generating 141 pages. Webpack is used locally because the shared dependency directory is a junction; production keeps the normal project configuration.
- Hosted description constraints, public salon access and authenticated-only owner-access grants verified after both migrations. Security-advisor findings are unchanged from before this release.
