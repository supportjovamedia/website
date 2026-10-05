# Sumera local website preview

Source: Google Drive > Clients > Sumera > UI > Sumera Home Page.png. The original 789 x 1994 design is preserved in output/Sumera Preview/Source in the parent workspace.

The one-page website recreates the concept's section order, pink palette, salon reception scene, booking interior and typography using live HTML, CSS and JavaScript. Headings, copy, navigation, buttons and cards remain editable native elements. Locally stored fonts include their licences. No tracking or external assets load with the page.

## Images

Most treatment and training photographs come from the existing [Sumera website media library](https://sumerasalon.co.uk/). The gallery presents treatment categories, without claiming that these are verified client results. The awkward hair-colour comb image has been replaced with a photograph of hair colouring, and gallery photographs show different treatment categories. The nail close-up is a licensed [SHVETS production photograph](https://www.pexels.com/photo/hands-with-manicured-nails-9775261/) with natural hand and nail geometry, used to illustrate nail care rather than a verified client result.

The two pink interior scenes in the concept exist only as small flattened crops. They were reconstructed with the built-in image editing tool to retain the composition, colours, signage, flowers, furniture and natural geometry. They are illustrative preview assets, not recovered original photographs or verified photographs of the premises. Full prompts and preserved originals are recorded in output/Sumera Preview/Source/image-restoration-notes.md. High-resolution photographs supplied by the salon are the preferred final production replacements. The unrelated stock model hero has been removed.

Responsive WebP images are exported at their native resolution or smaller, with multiple sizes where useful. The original design, generated PNGs, downloaded photographs and retired variants remain preserved outside the public preview. The public site contains no full-page design bitmap.

## Motion and interactions

Locally stored GSAP 3.15 and ScrollTrigger drive independent photo layers. The approved hero parallax and treatment sequence remain. The hero holds briefly on tall desktop and tablet viewports, with stable anchor wrappers and native scrolling. Phones and short viewports receive normal page flow.

The academy keeps a stable frame, with smooth image movement and no pin release or changing clip mask. Gallery frames stay aligned while their photographs move gently. Opposing marble layers retain their scroll movement. Booking uses restrained photo parallax. Reduced-motion mode removes pins and animation while retaining readable content and working controls.

Single-page navigation opens the appropriate section. Services reveal the salon's treatment menu and prices. Booking lets the visitor choose a service and open a prefilled WhatsApp enquiry or call the salon; the preview itself sends no message and confirms no appointment. Three existing course pages remain external links, as agreed for this preview. Gallery images support next/previous controls, arrow keys, Escape and focus restoration. Footer social links lead to the salon's existing accounts. Privacy, terms and cookies remain honest local preview notices pending final client policies.

Unverified review quotes, client counts and avatar proof were removed. No fabricated customer claims or placeholder integrations are presented as live services.

## Verification and review

Normal and reduced motion passed across 360, 390, 768, 791, 1440, 1920, 2560 and 3440 pixel widths. Desktop, preview-panel and phone scene checks confirm independent photograph movement, stable text during hero holds, stable academy frames and runtime reduced-motion cleanup. Single-page anchors, service details, booking links, course links and keyboard gallery controls passed. A short 791 x 450 viewport uses no hero pin. Browser checks reported no script errors, broken images or external asset requests.

The actual page was recorded during a scroll pass and the recording was played for review. The playable proof, screenshots, verification report and metadata audit are in output/Sumera Preview/Live Review. The final image assets and review captures plus the MP4 contain no detected EXIF, XMP, ICC, C2PA or AI-tool provenance metadata. Normal media codec information is retained. Removing metadata does not change the images' origin.

Run node sumera-preview-server.mjs from this directory.

Local URL: http://localhost:4176/previews/sumera/index.html

Prepared on the local feature branch codex/sumera-local-preview. No push, merge or publication has been performed. JovaMedia preview publication remains a later PR after localhost review.
