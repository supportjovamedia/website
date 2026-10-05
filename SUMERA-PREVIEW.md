# Sumera local design preview

Source: Google Drive > Clients > Sumera > UI > Sumera Home Page.png.

The supplied 789 x 1994 PNG was the same pixel image as the existing JovaMedia selected concept. The original Drive file is preserved in `output/Sumera Preview/Source` in the parent workspace. This rebuild preserves its section order, pink palette, brand, photography and core messaging.

The preview uses semantic live text, locally stored fonts, extracted source imagery, responsive layouts, anchor navigation, a keyboard-accessible mobile menu, service details, a gallery lightbox and reduced-motion support. Booking, course dates, social links and policies show accurate preview states. No requests are sent or saved. No external services or tracking are loaded.

The unverified 1000+ client count, avatar row and two testimonial quotes were removed during the motion and anti-slop revision. The gallery now describes treatments without presenting the images as verified client results. The original branding and supplied salon and course copy remain the basis of the preview. Source imagery is limited to the resolution of the original PNG. Full-resolution client photographs would improve a future production version.

The motion revision uses locally stored GSAP 3.15 and ScrollTrigger. Reception, treatment, academy, gallery and booking images use separate clipped motion layers. The academy photo frame opens as it moves, and the pink marble layers travel in opposite directions. Text remains readable and settles after short entrance animations. The sticky navigation shares an offset with native anchors. Reduced-motion mode removes the parallax, reveals and frame animation. Phone, tablet and large-screen widths use the same composition with adjusted travel. Scrolling stays native, with no pinned scroll traps, decorative counters, custom cursor or looping bob animations.

Verified with normal and reduced motion across 360, 390, 768, 791, 1440, 1920, 2560 and 3440 pixel layouts. Forward and return navigation, dialog keyboard focus, gallery controls and runtime reduced-motion changes passed at desktop, preview-panel and phone widths. Browser checks reported no script errors, broken images or external requests. The live in-app preview was also inspected. The final 17 WebP assets and 25 review screenshots contain no detected EXIF, XMP, ICC, C2PA or AI-tool metadata; source and capture originals are preserved outside the public preview.

Run from this directory:

```powershell
node sumera-preview-server.mjs
```

Local URL: http://localhost:4176/previews/sumera/index.html

Prepared on the local feature branch `codex/sumera-local-preview`. The Next.js preview redirect and indexing header are ready for a later JovaMedia PR. Do not push or publish until the user has reviewed localhost, as requested.

Font licences are retained beside the fonts. Exported WebP assets are re-encoded without EXIF, XMP, ICC or C2PA data. The original PNG is preserved separately.
