# Distinct system interface studies

This revision replaces the shared laptop composition with four product-specific visual directions. These are original HTML/CSS visual prototypes with fictional brands and sample records, not client work or functioning products.

| Family | Direction | Overview | Detail hero |
| --- | --- | --- | --- |
| Booking | Open green appointment shop | Salon photograph and service selection | Date/time selection with appointment summary |
| CRM | Compact slate desktop workspace | Sales pipeline board | Enquiry list with client-record drawer |
| Client portal | Warm document-focused project room | Project cover, review request and milestones | File browser with selected document and feedback |
| Membership | Navy and blue learning library | Featured lesson and chapter progress | Resource catalogue and saved learning progress |

The other five screens in each family show different workflows: availability, reminders, tasks, contacts, approvals, project messages, events and member settings. No generated photographs or generative image tools were used in this revision. Photographs are reused from the site's existing photography collection under `public/websites/photography`; their original acquisition records remain with that collection. There are no newly acquired stock assets or people in these selected photos.

## Editable source and export

Run `node design/system-studies-v2/gallery.mjs` to review the actual compressed exports at `http://127.0.0.1:4414/`. The gallery reserves each image's 8:5 aspect ratio, uses automatic height and constrains its grid columns. Supporting screens expand without stretching or horizontal overflow. It is a local review tool, not part of the public website.

With the gallery running, use `node design/system-studies-v2/check-gallery.mjs OPTIONAL_OUTPUT_DIRECTORY` to expand every group and check all 28 images at eight widths from 320 to 1920 pixels. On Windows set `REGRESSION_BROWSER_CHANNEL=chrome` to use installed Chrome. Optional output saves the geometry audit and phone/desktop proof screenshots. The public website browser checks separately require interface images to use `object-fit: contain` with their original dimensions.

1. Run `node design/system-studies-v2/create.mjs` after changing the source templates. This preserves the existing sample-workflow helpers from `design/system-studies/studies.js` and generates `studies.js`.
2. Run `node design/system-studies-v2/serve.mjs` and open `http://127.0.0.1:4413/?type=booking&view=card`.
3. Capture all four types (`booking`, `crm`, `portal`, `membership`) and seven views (`card`, `hero`, `scope-one`, `scope-two`, `scope-three`, `editorial-one`, `editorial-two`) at 1600 by 1000. These fixed-size prototypes are export sources, not responsive embedded apps.
4. Run `node design/system-studies-v2/export.mjs ABSOLUTE_ORIGINALS_DIRECTORY` to create the final WebP files and metadata/size/hash audit. Browser source captures are preserved separately under the local output folder.

Only the final static images are served by the website, using its existing responsive Next Image component. No prototype scripts, external fonts, iframes or dashboard code ship to visitors. The versioned image folder avoids stale image caches. The site retains accurate design-concept wording and descriptive alternative text, rather than claiming sample data is real customer evidence.

The 28 final exports total 1,100,362 bytes, approximately 14% smaller than the previous 28 images (1,277,086 bytes). The largest file is 60,478 bytes. The export checks require unique hashes, correct dimensions and only supported image-data WebP chunks. No EXIF, XMP, ICC, IPTC or provenance containers were detected. This is a metadata check, not a claim about platform labelling or invisible watermark detection.
