# Jova Media — Website

A marketing website for Jova Media, a digital media agency, built with
[Next.js](https://nextjs.org) (App Router), [Tailwind CSS v4](https://tailwindcss.com) and plain
JavaScript.

## Pages

- `/` — Home, with hero, services overview, stats, testimonials and FAQs
- `/about` — About Us
- `/services` — Services, one section per offering
- `/contact` — Contact Us, with a working contact form
- `/privacy-policy` — Privacy Policy (linked from the footer)
- `/terms-of-service` — Terms of Service (linked from the footer)

## Getting started

Requires Node.js 18.18+ (Node 20 LTS recommended).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  layout.js            Root layout — fonts, header, footer, metadata
  page.js              Home page
  about/page.js
  services/page.js
  contact/page.js
  privacy-policy/page.js
  terms-of-service/page.js
  api/contact/route.js Contact form API route (Node.js server logic)
  sitemap.js, robots.js
components/            Reusable UI (Header, Footer, ContactForm, etc.)
lib/data.js            All site copy, services, testimonials & config in one place
public/images/         Brand logo, icon and generated favicons
```

## Editing content

Almost all site copy — services, testimonials, team, stats, FAQs, contact details, social links —
lives in `lib/data.js`. Update that file first; most pages will pick the changes up automatically.

## Brand

- **Colours:** Midnight Navy `#0D1B2A`, Warm Ivory `#F6F4EF`, Champagne Gold `#C9A96E`, Cool Stone
  `#8D9299` — defined in `app/globals.css` and available as Tailwind utilities (`bg-navy`,
  `text-gold`, etc.).
- **Fonts:** Cormorant Garamond for the brand name and headings (`font-serif-brand` /
  `font-serif`), Montserrat for body copy and UI (the default).

## Contact form

The form on `/contact` posts to `app/api/contact/route.js`, which validates the submission,
applies basic rate limiting, and currently logs it server-side. Before going live, wire this up to
an email or CRM provider — the route has a `TODO` comment with suggestions (Resend, Postmark, a
CRM webhook, etc.).

## Deployment

The site builds as a standard Next.js app and deploys to Vercel, Netlify, or any Node.js host:

```bash
npm run build
npm start
```

Before deploying, update `siteConfig` in `lib/data.js` with your real domain, email, phone and
address, and update `metadataBase`/social links accordingly.
"# website" 
