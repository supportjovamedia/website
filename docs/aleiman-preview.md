# Al Eiman preview

Entry: `/previews/aleiman/`, redirected to `/previews/aleiman/index.html`.

Four standalone static pages live under `public/previews/aleiman`. They do not render JovaMedia's root layout, navigation, global styles or chat widget. No portfolio listing, sitemap entry or site navigation link is added. Only this preview path gets the additional noindex, nofollow, noarchive header. All four HTML pages include noindex metadata. Unlisted URLs remain accessible to anyone who has the link; no password protection is claimed.

This is a review copy of the approved Al Eiman design. The hosted form prevents normal submission and makes no network request or storage write. It explicitly says nothing was sent or saved and provides Al Eiman's email. It never calls JovaMedia's `/api/contact` endpoint. The standalone localhost project remains separate and retains its local storage behaviour.

Fonts, photos, scripts and styles are local to the preview directory. Google Maps and the original tutorial video need external network access. The business postcode in the supplied site differs from Google's map card; both remain as supplied. The original landmark download buttons had no file destinations and are replaced with city collection links.

Photos: existing Al Eiman concept credits are retained in `public/previews/aleiman/PHOTO-CREDITS.md`. Nine landmark images come from `https://aleiman.co.uk/images/place1.jpg` through `place9.jpg`. The Google map retains attribution.

Checks: `node --test tests/aleiman-preview.test.mjs`, a production Next build, and browser checks of navigation, city filters, form isolation and responsive layout.
