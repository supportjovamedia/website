# JovaMedia — refined original design

## Run locally

Extract this project into a new folder, open it in VS Code, and use Node.js 20.9 or newer.

    npm ci
    npm run dev

Open http://localhost:3000.

Production check:

    npm run build
    npm start

## Final design

The original JovaMedia design, supplied logos and page content have been restored. The alternate redesign is not used in this project.

- Numbered homepage sections alternate blue / light / red / light / blue / light.
- Removed decorative arrows, arrows on buttons, abstract geometry, yellow discs, circular service badges and geometric image masks.
- Kept the original headline, rectangular buttons, typography, service list and compact black footer.
- Removed the independent-agency/London eyebrow.
- Replaced the old building crop with an original generated architectural image. No stock photographs or third-party website images are used.
- Preserved LinkedIn, Instagram, X and TikTok. They link to their platform homepages as requested; edit lib/site.js when agency profiles are ready.
- Improved spacing, touch targets, focus states and mobile menu keyboard behaviour.

## Functionality and limits

The previous contact endpoint logged personal details and returned a misleading success message without delivering email. It now returns an honest unavailable response. The contact form instead prepares a brief for the visitor to review and send in their email app, with a copy option. Nothing is sent automatically. Configure a real delivery provider later if you want direct website submissions.

The contact email remains support.jovamedia@gmail.com. Analytics is off unless NEXT_PUBLIC_ENABLE_ANALYTICS=true is configured. Canonical links now point to the appropriate pages, and the duplicate terms URL uses the same maintained content. Existing legal copy remains subject to owner review.

The Work page retains the original status: client case studies are not yet published. The homepage concept card is an illustration of the design direction, not a client result.

## Verification

- Production build passed, including 37 generated pages.
- Homepage checked in-browser at 320px, 390px, 768px and 1440px with no horizontal overflow.
- Contact form and service directory checked at 320px.
- Mobile menu open, Escape-to-close and enquiry draft preparation verified.
- Main routes and all 20 service detail routes checked. Missing pages return 404. The unconfigured contact endpoint returns 503 instead of false success.

## Main files

app/page.js — homepage content and section order
app/home.module.css — homepage layout and responsive rules
app/globals.css — shared styles and final refinement rules
components/Header.js — original logo and accessible mobile navigation
components/Footer.js — original footer with social platform links
components/ContactForm.js — local enquiry review and email draft
lib/site.js — social URLs and email setting
public/original/jova-architecture.png — original generated hero image

## Image provenance

The architectural image was generated with the built-in image-generation tool and inspected. Prompt: "Original portrait architectural photograph of an elegant sweeping modern glass office facade, viewed upward at a close oblique angle; charcoal and cool blue-grey glass, crisp linear mullions, soft overcast pale sky, believable continuous editorial photography; no recognisable landmark, brands, text, yellow discs, graphics, circles or arrows."

The logo and favicons are the assets supplied with your original project. The ZIP excludes unused legacy photos, the alternate redesign's imagery, installed dependencies, build output and old Git history.
