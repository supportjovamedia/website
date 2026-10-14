# Editorial imagery

Stock photographs illustrate the article subjects. They are not JovaMedia client photographs or examples of a particular salon's work.

- `lash-treatment.webp`: RDNE Stock project, [A Woman Holding a Tweezer](https://www.pexels.com/photo/a-woman-holding-a-tweezer-7755531/).
- `salon-interior.webp`: Max Vakhtbovych, [Photo of the Interior of a Salon](https://www.pexels.com/photo/photo-of-the-interior-of-a-salon-7750108/).
- `qaiser-website.webp`: crop of JovaMedia's existing Qaiser Watches website screenshot, `public/home-selected/qaiser-watches.png`. This is a real project.
- The launch article uses the existing `service-editorial/copywriting.jpg` photograph by Cup of Couple. Attribution is recorded in `public/service-editorial/SOURCES.md`.

Pexels photographs were downloaded from the Pexels CDN on 14 October 2026 under the [Pexels licence](https://www.pexels.com/license/). Original downloads and the original project screenshot are preserved outside the checkout in `output/seo/originals`. New WebP exports contain no EXIF, XMP, IPTC or C2PA metadata. Reproduce with `node scripts/prepare-editorial-images.mjs`.

The booking commission illustration and the website starting-price comparison are HTML and CSS, using the figures explained in the associated articles. They are not photographs, provider screenshots or client results.

The three `-share.jpg` files are metadata-free JPEG versions used by the article share-image renderer, which requires JPEG or PNG source pixels.
