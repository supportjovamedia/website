# JovaMedia homepage preview

Local preview: http://127.0.0.1:3000

This branch explores a homepage rebrand informed by the supplied PIKIZ recording. It retains the original JovaMedia logo and blue, uses alternating light and navy sections, and adds clearer service and process content. Only the homepage uses the new presentation. Other routes retain their existing shared header, newsletter and footer.

Motion includes a title entrance, a staggered project gallery responding to scroll, image parallax, section reveals and a pausable text strip. Reduced-motion preferences are respected. Project previews open as keyboard-accessible dialogs; the FAQ uses native disclosure controls.

The three images are optimised copies of existing JovaMedia concept work. Source originals were preserved at their existing workspace paths. Final WebP files contain only VP8 image chunks, with no EXIF, XMP or C2PA chunks. No paid image or video generation was used. The Costa study is clearly identified as independent work rather than a client commission.

Verification: local production build, source lint, 46 existing tests against the running local server, desktop and mobile browser checks. The existing service-link test now checks unique destinations because the design has both service links and group navigation.

Unrelated pre-existing edits to components/HomepageMotion.js and public/campaign/costa-showcase.jpg are excluded from this branch's commit.
