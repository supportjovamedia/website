# Sumera editorial website preview

Current local URL: http://localhost:4176/previews/sumera/index.html

This is an editable one-page website for local salon clients and prospective academy students. The revised direction uses warm cream, plum and rose; Instrument Serif and Geist; a still reception hero; a treatment directory; a salon interior section; a distinct academy panel; an asymmetric gallery; and clear visit details. It replaces the earlier repeated pink cards and animated hero while retaining the salon identity and reception/interior scenes.

Skills applied: Website Studio, Redesign Existing Projects, Design Taste Frontend and High-End Visual Design. The explicit working-website request takes precedence over Website Studio's video-only default. The user's static-hero preference takes precedence over general animation guidance.

## Working controls and motion

Navigation scrolls to ordinary sections on this page. Five treatment categories change the supporting photograph on hover or keyboard focus and open the existing menu with prices. Booking lets visitors select a treatment and prepare a WhatsApp enquiry or call the salon. The preview sends no message and confirms no appointment. Course links open the existing Sumera course pages, as previously agreed. Four gallery photographs open in a keyboard-accessible native dialog. Escape dismisses dialogs and restores focus. The mobile menu, public social links, directions and telephone links remain usable.

The hero has no CSS or GSAP animation, transforms, fades, changing masks or scroll pinning. Below it, two photographs move gently inside fixed frames and five section introductions make small once-only vertical entrances. Copy never fades out. There is no scroll hijacking, horizontal gallery wave or pinned academy scene. Reduced motion removes movement and supports runtime cleanup.

## Sources and image origin

The original supplied design, Google Drive > Clients > Sumera > UI > Sumera Home Page.png, remains preserved outside the public website. Business contact details, academy claims and course destinations were checked against https://sumerasalon.co.uk/ on 5 October 2026. No opening hours, client reviews, customer counts or results were invented.

The reception and salon images are the existing AI-assisted reconstructions of low-resolution crops from the supplied concept. They retain the original depicted scenes, but are illustrative preview assets rather than recovered original photographs or verified photographs of the premises. No new generated portraits or scene images were added for this redesign. Preserved source crops, reconstruction originals and prompts are in the existing Source/image-restoration-notes.md. High-resolution photographs supplied by the salon would be the preferred production replacement.

The training room and several treatment photographs come from the client's existing media library. A visibly watermarked Adobe Stock hair photo from that library was replaced with Engin Akyurt's licensed photograph: https://www.pexels.com/photo/person-cutting-hair-3356170/. Its source original, dimensions, export variants and licence are recorded in Source/editorial-photo-source.json. The existing SHVETS production manicure photo is also illustrative licensed photography: https://www.pexels.com/photo/hands-with-manicured-nails-9775261/. Pexels permits website use without required attribution: https://www.pexels.com/license/. No photograph is presented as a verified client result or endorsement.

Fonts and local GSAP assets retain their licences. All assets load locally; the page has no analytics, tracking or saved cookies. Privacy, terms and cookies buttons show honest preview notices pending final salon policy text.

## Review evidence

At 360, 390, 768, 791, 1440, 1920, 2560 and 3440 pixels, the page fills the viewport with no horizontal overflow or broken images. Phone hero and section headings are centred. The actual in-app preview was also inspected.

Forward and back navigation, all five service menus, booking selection, academy menus, all four gallery images, arrow-key navigation, Escape and focus restoration passed at 390, 791 and 1440 pixels. Hero pose comparisons confirmed a static image and copy during scrolling. Interior photo transforms changed smoothly within their fixed frames; runtime reduced-motion cleanup and a short viewport dialog check passed.

Axe 4.10.3 automated WCAG A/AA and WCAG 2.1 AA checks reported no violations for the final page, booking dialog, service dialog and gallery dialog at 390, 791 and 1440 pixels after darkening secondary text. This is an automated audit plus targeted keyboard testing, not a claim of exhaustive accessibility certification.

Live Review/Editorial contains screenshots, verification.json, accessibility.json, the current browser scroll recording and metadata-checks.json. The final screenshots are captures of the functioning HTML website, not the website implementation. Archived initial full-page inspection images may show the retired hair photo; current review images are named final-*.

Export checks found no EXIF, XMP, ICC, C2PA, JUMB or AI-tool metadata in the website WebP assets and cleaned review JPEGs, and no detected AI provenance markers in the MP4. Browser screenshot metadata was removed losslessly by stripping optional JPEG metadata segments; original captures remain separate. Removing metadata does not change image origin. Normal media codec information is retained.

The previous website is preserved in Source/Before editorial redesign. The reviewed working draft is archived in Source/2026-10-05-editorial-design. Editable production files are in public/previews/sumera in the feature-branch worktree.

Run node sumera-preview-server.mjs from the worktree to serve the local preview. Nothing has been pushed, merged or published. JovaMedia publication remains a later pull request after localhost review.
