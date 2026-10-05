# Sumera local design preview

Source: Google Drive > Clients > Sumera > UI > Sumera Home Page.png.

The supplied 789 x 1994 PNG was the same pixel image as the existing JovaMedia selected concept. The original Drive file is preserved in `output/Sumera Preview/Source` in the parent workspace. This rebuild preserves its section order, pink palette, brand, photography and supplied copy.

The preview uses semantic live text, locally stored fonts, extracted source imagery, responsive layouts, anchor navigation, a keyboard-accessible mobile menu, service details, a gallery lightbox and reduced-motion support. Booking, course dates, social links and policies show accurate preview states. No requests are sent or saved. No external services or tracking are loaded.

The client claims and two testimonials come from the supplied design. Their wording has been preserved for design review and has not been independently verified. Source imagery is limited to the resolution of the original PNG. Full-resolution client photographs would improve a future production version.

Run from this directory:

```powershell
node sumera-preview-server.mjs
```

Local URL: http://localhost:4176/previews/sumera/index.html

Prepared on the local feature branch `codex/sumera-local-preview`. The Next.js preview redirect and indexing header are ready for a later JovaMedia PR. Do not push or publish until the user has reviewed localhost, as requested.

Font licences are retained beside the fonts. Exported WebP assets are re-encoded without EXIF, XMP, ICC or C2PA data. The original PNG is preserved separately.
