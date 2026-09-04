# JovaMedia changelog

## v1.2 - Clean brand system

### Brand
- Added the supplied JovaMedia primary logo to the global header and footer.
- Added the supplied J monogram as the browser favicon and Apple touch icon.
- Replaced the previous acid-green palette with the JovaMedia navy and gold brand colours.
- Removed decorative outlined headline styling so typography reads more like a mature corporate brand.

### Visual system
- Moved the site to a predominantly white canvas with restrained light-neutral sections.
- Removed large dark/coloured content backgrounds from the main site experience.
- Gold is now used as a small accent for labels, active states and details rather than as a page background.
- Navy is reserved for primary typography, buttons and key interface elements.
- Added softer borders, rounded content panels and restrained interaction states.
- Increased whitespace and simplified visual hierarchy across desktop and mobile.

### Navigation
- Retained the sticky desktop navigation with Services, Work, About, Insights and Contact.
- Retained active-page navigation states.
- Retained the responsive mobile menu, now on a clean white surface.
- Kept keyboard Escape support, scroll locking and accessible menu labels.
- Updated logo treatment across navigation breakpoints.

### Responsive layout
- Retained the 1600px large-screen content system.
- Services expand to three columns on large displays, two on standard desktop and one on mobile.
- Hero content centres on mobile while long-form content and service cards remain left aligned for readability.
- Refined mobile spacing, typography and touch targets.

### Footer
- Reworked the footer to white with a subtle divider rather than a large dark block.
- Added the supplied JovaMedia logo.
- Retained full site navigation, legal links, contact details and conversion CTA.

### Accessibility and technical
- Retained skip-to-content navigation.
- Retained visible keyboard focus states.
- Retained reduced-motion support.
- Fixed the root content wrapper so page-level `<main>` elements are no longer nested inside another `<main>`.
- Added Next.js app icons from the supplied JovaMedia monogram.

### Design references
The visual direction was informed by the supplied PayPal and Meta references: white space, high-contrast typography, simple navigation, large focused headlines, restrained colour and content-led sections. The implementation remains original to JovaMedia rather than copying either site.

## v1.3 — Premium agency refresh
- Added Home to desktop and mobile navigation.
- Kept the global top bar fixed at all viewport sizes.
- Mobile/tablet menu now closes on link selection, route change, Escape, or page scroll.
- Centred page content and key interactions at 768px and below while keeping form fields readable.
- Changed footer to a high-contrast black treatment.
- Introduced a restrained block palette using JovaMedia navy, warm gold, pale navy and neutral grey while keeping white as the primary canvas.
- Rebuilt the homepage with stronger hierarchy, alternating editorial sections, clearer CTAs and more inviting copy.
- Rebuilt Services as a richer capability directory grouped into Social & Community, Creative & Influence, and Performance & Digital.
- Expanded service offering to include social strategy & consulting, social media management, social content production, community management & listening, paid social/performance media, influencer & creator marketing, social selling & outbound, analytics/ROI/reporting, web design, SEO, content/copy/email, and brand strategy.
- Rewrote About, Work and Contact copy to feel more confident, client-focused and commercially relevant without inventing proof or credentials.
- Preserved JovaMedia logo colours as accents rather than full-page background colours.
- Removed Tailwind/PostCSS dependency from the project package; styling remains plain CSS.

## v1.4 — Premium contact and social layer
- Added a large black GET IN TOUCH conversion section inspired by premium agency footer patterns, with original JovaMedia copy.
- Added Instagram, TikTok, X / Twitter, Facebook and LinkedIn placeholder controls ready for future URLs.
- Kept the footer black and strengthened the visual transition into it.
- Corrected brand image intrinsic dimensions in the footer.
- Added responsive centred treatment for the new footer elements at 768px and below.

## v1.5 — Senior product-design pass
- Removed Insights from navigation, footer, sitemap and routes.
- Removed rounded card, button, input, social-button and logo-container geometry.
- Reworked homepage copy to be more specific, restrained and commercially credible.
- Reduced oversized/empty hero behaviour and tightened desktop vertical rhythm.
- Rebuilt responsive widths and breakpoints to avoid the narrow floating-page effect.
- Preserved centred presentation at 768px and below.
- Kept fixed header and close-on-scroll mobile navigation.
- Retained black footer and Get in Touch conversion section.
- Tightened service-card grids into a more editorial, structured system.
