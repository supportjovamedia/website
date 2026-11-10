# Hero and share preview refresh

The homepage hero now uses new captures of the current local fictional portal. The MacBook capture is 2560 x 1664 and the phone capture is 880 x 1912, both taken at 2x pixel density. The captures include the current full-width calendar and its red Note indicator. No real account data was used.

The previous delivery converted JPEG screenshots to lossy WebP. The new pipeline captures PNG directly and exports lossless WebP. Every decoded RGB pixel was compared against its source PNG. Dashboard yellow remains #FFD700. Original PNGs and verification reports are retained locally under `output/hero-share-quality/`.

| Asset | Previous bytes | New bytes |
| --- | ---: | ---: |
| MacBook screen | 168,576 | 74,994 |
| Phone screen | 101,962 | 44,668 |
| Combined | 270,538 | 119,662 |

The homepage still requests two hero images. Both use content-hashed filenames and the existing one-year immutable cache. No background refresh or polling was added. This change reduces hero transfer bytes by approximately 56%; it does not claim to eliminate CDN requests from real page views.

The 1200 x 630 share card uses the same current screens, homepage headline and supporting copy. Its actions are shown separately as Start free and Watch the demo, replacing the combined Start free / commission badge. Open Graph, X and the legacy image endpoint use the new versioned PNG. Versioned share images now have a one-year immutable cache; the mutable share manifest does not receive that rule.

Local browser checks at 360, 390, 768 and 1440 pixels verified the current image URLs, full image opacity, no filters, sufficient source resolution for 2x displays, no horizontal overflow, exactly two hero image URLs and a working demo dialog. Existing sharing, screenshot-source and metadata tests passed. Delivered images were scanned for EXIF, XMP, IPTC, ICC and AI-tool/provenance markers; none were found.

The local production build generated all 141 pages successfully. Built HTML references the current hero images and share URL, with one H1. The static share image and `/opengraph-image` return identical PNG bytes. Both hero assets and the versioned share image return one-year immutable cache headers, while the share manifest remains mutable. A 15-second observation after startup recorded no requests. This local sample does not measure production-wide traffic. The new share PNG is 98,622 bytes, compared with 288,541 bytes previously. Focused ESLint reported no errors and three existing native-image warnings; direct image delivery is intentional for these pre-optimized immutable assets.

No authentication, session, booking, pricing or database behavior was changed.
