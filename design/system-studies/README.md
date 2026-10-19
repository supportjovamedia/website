# JovaMedia system interface studies

Four original HTML/CSS interface concepts for the Websites directory and the Booking, CRM, Client Portal and Membership pages. All records, brands, figures and project information in the concepts are fictional sample data. These are visual prototypes, not commissioned client projects or working production products.

Run `node design/system-studies/serve.mjs`, then open `http://127.0.0.1:4408/?type=booking&view=card`.

- Types: `booking`, `crm`, `portal`, `membership`.
- Views: `card`, `hero`, `scope-one`, `scope-two`, `scope-three`, `editorial-one`, `editorial-two`.
- Export canvas: 1600 by 1000 pixels. The canvas has fixed dimensions because it is an export source, not an embedded responsive app.
- Capture each view through the browser. Original captures are preserved separately in the local output folder.
- Run `node design/system-studies/export.mjs ABSOLUTE_ORIGINALS_DIRECTORY` to compress the captures to WebP and audit final dimensions, size, hashes and metadata.

The site delivers the compressed images through Next Image with responsive sizes, lazy loading below the fold, meaningful alternative text and reserved dimensions. No scene code, external font, iframe, remote asset or social widget is loaded by these images. The browser-rendered interfaces contain no generative imagery or photographs of people.

All 28 delivered WebP files were scanned after export. Only image-data chunks remain. No EXIF, XMP, ICC, IPTC, C2PA or JUMBF metadata containers were found. Original captures remain separate for recovery.
