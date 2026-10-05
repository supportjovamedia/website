# Al Eiman design and motion refinement

The homepage brings a large amount of travel information together. This pass gives it a clearer rhythm through white, sage, deep green and warm sections, readable type, and progressive disclosure for service options.

The approved pilgrimage identity remains: real photography, Manrope text, Cormorant display headings, green and muted gold. The design direction is expressive enough to feel authored, with restrained motion and a comfortable content density. The working Taste settings are design variance 6, motion intensity 5, visual density 4.

## Changes

- Larger body copy and controls across all four pages, with stronger display headings and fewer repeating section labels.
- A sticky navigation header and consistent footer links. The phone hero puts its centred copy and actions above the photograph.
- The services keep their vertical photo-card sequence and native scrolling. Category links reach stable flow markers, active state follows the visible reading position, and keyboard focus immediately brings a covered card back into view.
- Hero and landmark photographs move subtly within clipped crops. Text, buttons, captions and reading surfaces remain stationary within their sections.
- The Umrah guide keeps its sticky contents panel and now highlights the current reading chapter. Long instructions have a bounded text measure.
- Phone cards and secondary content are more compact, without removing the site's travel categories, resources, announcements or customer quotations.
- Motion respects reduced-motion preferences. Short screens use static service cards. All content remains visible without animation scripts, and phone navigation is available without JavaScript.
- Below-the-fold photography and the map load lazily. Landmark links open the appropriate city filter.

## Validation

Browser review used actual rendered pages and interaction tests, followed by targeted corrections and confirmation. The first pass found premature service highlighting, unreliable native navigation to the final sticky card, delayed keyboard restoration and several low-contrast labels. Those issues were corrected.

- All four pages passed width checks at 320, 360, 390, 430, 768, 820, 1024, 1280, 1440, 1920, 2560 and 3440 pixels, 48 checks in total. Outer backgrounds fill the viewport; reading columns remain bounded.
- Desktop and phone screenshots reviewed for all pages, including service, landmark, form and ritual sections.
- Service anchors tested in both directions, all four foreground panels checked, disclosures opened and closed, covered keyboard focus restored, reduced motion and short-screen fallback checked.
- Phone menu opening, Escape and focus restoration, city deep links and filters, photograph dialog, packing checklist, supplications and native form validation checked.
- axe-core reported zero WCAG A/AA rule violations on all four pages at 390 and 1440 pixels, plus the open packing dialog. This is automated coverage, not an accessibility certification.
- No page script errors or failed local resource requests in the browser checks. Production Next.js 16.3.4 build passed using webpack. The changes remain inside the isolated Al Eiman preview and this review note.

## Motion and finishing references

[Taste](https://github.com/Leonxlnx/taste-skill) informed the existing design review. [Impeccable](https://github.com/pbakaus/impeccable) supplied finishing and readability guidance. Its automated context engine could not download in this environment, so no Impeccable detector result is claimed. Visual review and axe-core provided the actual verification. [Official GSAP skills](https://github.com/greensock/gsap-skills) informed the responsive ScrollTrigger work, using matchMedia cleanup and transform-only photography motion.

## Delivery and limits

Actual browser motion proofs, phone and desktop PNGs, full-page screenshots and QA results are saved locally under `output/Al Eiman Redesign/Refined Website` and `work/aleiman-calmer-layout/review/editorial`. Original captured frames are preserved. PNG exports contain only image chunks. MP4 exports have been scanned for named AI/provenance metadata; ordinary MP4 container and H.264 codec identifiers remain.

The contact form remains a clearly labelled preview and does not send or save messages. Telephone and email links contact Al Eiman directly. Map and video embeds remain third-party services. Desktop and phone sizes were tested in Chromium, without a claim of physical-device or every-browser certification.

Changes are submitted through PR 32. Production remains on its previously approved version until the PR is explicitly approved for merge.
