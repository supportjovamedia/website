# JovaMedia — mobile reference rebuild

## Run in VS Code

1. Extract this ZIP to a new folder and open that folder in VS Code.
2. Use Node.js 20.9 or newer (Node 22 or 24 recommended).
3. In the VS Code terminal run:

   npm ci
   npm run dev

4. Open http://localhost:3000. Use your browser's responsive mode at 390px wide to review the mobile layout. Also check 320px and 430px.

For a production build: npm run build, then npm start.

## What changed

- Rebuilt the homepage stylesheet around the supplied phone references.
- Fixed the actual document order: hero, introduction (01), services (02), work (03), process (04), why us (05), contact (06).
- Matched the three-line hero heading, muted blue/red palette, diagonal building imagery, yellow accents, compact service rows, vertical process timeline and full-width blue banner.
- Added consistent SVG line icons and a compact header/footer.
- Kept the existing Next.js app, dependencies, lockfile, service routes, content pages and contact route.
- The screenshots show two portions of one long mobile page side by side; this implementation scrolls as one page on a phone. The phone frame and screenshot Edit/share/download controls are not website elements.
- Desktop and tablet layouts adapt the same content to wider screens.

## Existing limitations

- The contact API in app/api/contact/route.js only writes submissions to the server log. It does not deliver email or persist enquiries. Connect a real email/form service before launch.
- No social profile URLs were supplied. Footer social icons are disabled placeholders; configure real destinations before launch.
- Only one concept project was provided. The work card links to the existing Work page; no fake three-slide pagination was added.
- The supplied raster artwork includes crops from earlier mockups. CSS clips/composes those existing assets; this is a close reconstruction, not a claim of pixel-perfect equivalence.
- Browser-based visual testing has been left for your local review as requested.

## Main edited files

app/page.js
app/home.module.css
app/globals.css
components/Footer.js
components/LineIcon.js

The ZIP excludes node_modules, build output, and the old embedded Git history.

Validation: npm ci and npm run build completed successfully; all 37 pages generated.
