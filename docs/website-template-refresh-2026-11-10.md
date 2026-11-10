# Website template refresh

## Implemented

- Replace the four current designs with Evergreen, Cobalt, Terracotta and Olive. Retain stored IDs `one-page`, `brightside`, `form` and `willow` so existing saved selections still resolve.
- Share one escaped renderer and one scoped stylesheet between the public portal and homepage showcase.
- Retain saved business names, headlines, descriptions, colours, uploaded images, contact details, hours and real tenant booking destinations.
- Add the service lists and prices shown in the references. Reveal additional services with View All Services.
- Use native mobile menu disclosures, a close icon, Escape and outside-click dismissal, and section navigation. Cobalt and Olive use sidebars on desktop.
- Remove decorative arrows. Underline the JovaMedia website credit on all four new designs, including paid accounts, as requested.
- Render real template miniatures in the dashboard instead of the old approximate thumbnail graphics. Add Preview selected design beside the choices without requiring a save.
- Keep all four picker thumbnails in a 390-pixel mobile layout with portrait crops. Selected-design dialogs also stay phone-sized on desktop. Public business websites retain their responsive desktop layouts.
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

## Review dependencies and queued follow-up

- Visual approval of the remaining designs is ongoing. Evergreen was accepted during the local review. Images are existing project examples rather than the exact mockup photos.
- Only mobile/narrow references were provided for Evergreen and Terracotta. Their desktop layouts adapt the same design; Cobalt and Olive have supplied desktop references.
- Product copy still advertises Team branding removal. The new instruction to retain a website credit on every design needs that existing marketing promise clarified before release. No plan price, billing logic or entitlement was changed here.
- Mobile/online address enforcement is a separate confirmed issue: onboarding records the service-location choice, while Business information and the legacy setup form still mark Address required. Do not claim this is fixed by hiding the website location row. This remains queued for an end-to-end form and backend correction.
- PRs 199 and 200 are separate branches and are not included in this change.

Local review entry: `http://127.0.0.1:4466/?preview=day#scheduling`, then Website design. The temporary four-design gallery is a local review artifact and is not part of the release.
