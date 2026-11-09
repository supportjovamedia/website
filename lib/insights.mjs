import { bookingSetupArticles } from './articles/booking-setup.mjs';
import { articleSearchRefinements } from './articles/search-refinements.mjs';
import { smallBusinessWebsiteArticle, websiteDecisionArticles } from './articles/website-decisions.mjs';
import { phpSecurityArticles, phpSecuritySources } from "./articles/php-security.mjs";
import { customSalonBookingArticle } from "./articles/custom-salon-booking-system-investment.mjs";
import { googleGrowthArticles, googleGrowthSources } from "./articles/google-growth.mjs";
import { bookingTips } from './articles/booking-tips.mjs';
import { bookingAlternativeArticles } from './articles/booking-alternatives.mjs';
import { bookingGrowthArticles, bookingComparisonArticle, bookingGrowthSources } from './articles/booking-growth.mjs';

const p = (text, sources = []) => ({ type: "paragraph", text, sources });
const h = (id, title) => ({ type: "heading", id, title });
const list = (items) => ({ type: "list", items });
const table = (headers, rows, caption) => ({ type: "table", headers, rows, caption });

export const editorialDate = "2026-10-14";
export const sources = {
  ...bookingGrowthSources,
  acuity: { title: "Acuity Scheduling pricing", url: "https://acuityscheduling.com/pricing" },
  treatwellPlans: { title: "Treatwell UK partner pricing", url: "https://www.treatwell.co.uk/partners/pricing/" },
  ...googleGrowthSources,
  ...phpSecuritySources,
  booksy: { title: "Booksy UK pricing", url: "https://biz.booksy.com/en-gb/pricing" },
  booksyFeatures: { title: "Booksy UK features", url: "https://biz.booksy.com/en-gb/features" },
  treatwell: { title: "Treatwell UK partner pricing", url: "https://www.treatwell.co.uk/partners/pricing/" },
  fresha: { title: "Fresha UK pricing", url: "https://www.fresha.com/en-GB/pricing" },
  googleContent: { title: "Google: helpful, reliable content", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
  googleSeo: { title: "Google SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide" },
  googleBusiness: { title: "Google Business Profile eligibility", url: "https://support.google.com/business/answer/13763036" },
  googleLocal: { title: "Google: improving local ranking", url: "https://support.google.com/business/answer/7091" },
  googleIndex: { title: "Google: asking for a recrawl", url: "https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl" },
  squarespace: { title: "Squarespace: building a salon site", url: "https://support.squarespace.com/hc/en-us/articles/115012547847-Building-a-salon-site" },
};

const baseArticles = [
  ...bookingSetupArticles,
  smallBusinessWebsiteArticle,
  ...websiteDecisionArticles,
  ...bookingGrowthArticles,
  ...bookingAlternativeArticles,
  bookingComparisonArticle,
  ...googleGrowthArticles,
  ...bookingTips,
  ...phpSecurityArticles,
  customSalonBookingArticle,
  {
    slug: "small-business-website-cost-uk",
    updatedAt: "2026-11-08",
    title: "What should a small business website cost in the UK?",
    seoTitle: "Small Business Website Cost UK: What Is Included?",
    description: "Understand JovaMedia's £350, £550 and £2,000 website starting prices, what changes the quote, recurring costs and the questions to ask before paying.",
    category: "Website planning", cover: "cost", keyword: "small business website cost UK",
    summary: "A practical look at the build, the ongoing costs and what a clear quote should tell you.",
    answer: "Website cost depends on the job the site must do. A focused landing page, a four-page business site and a custom booking system are different purchases. Compare the agreed deliverables and ongoing charges, not page count or the headline price alone.",
    related: ["does-a-small-business-need-a-website", "landing-page-vs-full-website", "small-business-website-brief-template", "salon-booking-platform-fees-vs-own-website"],
    blocks: [
      p("Two quotes can both say 'business website' and describe very different work. One might mean four pages built from your finished copy and images. Another might include writing, photography, an online shop, booking logic and ongoing support. Comparing the totals without comparing the scope is a poor way to choose."),
      p("You do not need a national average to decide whether a quote makes sense for your business. You need to know what you are buying, what you must supply and what you will keep paying after launch. This guide uses JovaMedia's actual published starting prices, rather than presenting them as an industry-wide price range."),
      h("starting-prices", "Three starting points, with different jobs"),
      table(["Website", "JovaMedia starting price", "Designed for"], [
        ["Landing page", "£350 one-off build", "One focused page for a service, product or campaign, with one clear next step."],
        ["Business website", "£550 one-off build", "Four core pages: Home, About, Services and Contact, with an enquiry route."],
        ["Website with booking system", "£2,000 one-off build", "A business website plus an agreed appointment-booking workflow and its own admin panel."],
      ], "Starting prices checked on 14 October 2026. JovaMedia currently charges no VAT. Your written quote confirms the scope and separate costs."),
      p("Our [pricing page](/products/pricing) lists the current package comparison. A starting price is not a promise that any requested feature will fit inside that budget. Online payments, a shop, customer accounts, complex scheduling, copywriting or a migration should be described and priced explicitly."),
      h("included", "What should be included in a straightforward business website?"),
      p("For a small service business, start with the questions a customer asks before contacting you: what do you do, where do you work, why should I trust you and how do I get in touch? Four well-planned pages can answer those questions. More pages help when they explain genuinely different services or customer needs."),
      list([
        "A page plan and design direction agreed before the build.",
        "A layout that works on phones, tablets and larger screens.",
        "Your services, supplied images and agreed content arranged clearly.",
        "A working enquiry form and useful phone or WhatsApp links.",
        "Descriptive page titles, headings, internal links and search foundations.",
        "A review stage, agreed revisions and clear handover arrangements.",
        "Written information about domain access, source files, hosting and ongoing responsibilities.",
      ]),
      p("Search foundations help a search engine understand the pages. They do not guarantee a first-page result or a stream of enquiries. Google describes SEO as helping search engines understand content and helping users decide whether to visit a site." , ["googleSeo"]),
      h("what-changes", "What changes the quote?"),
      p("Content is often the first difference. Supplying final text and usable photographs is different from asking someone to interview you, write the site and source the images. Product catalogues take time to organise. A booking button that opens an existing service is much simpler than a new scheduling system with staff availability and cancellation rules."),
      p("Redesigns have their own work: checking existing pages, preserving useful URLs, redirecting moved content and planning the launch. Agree what happens to your current domain, email and search traffic before replacing anything."),
      h("ongoing-costs", "The ongoing costs to put beside the build price"),
      table(["Cost", "What to ask"], [
        ["Domain", "Who owns it, where is it registered and what is the renewal price?"],
        ["Hosting and data", "What service runs the site, what allowance is included and what happens if usage grows?"],
        ["Business email", "Is the mailbox included, and will changing the website affect existing email?"],
        ["Care and updates", "What checks and edit time are included? Are larger changes agreed separately?"],
        ["Booking and payments", "Are there subscriptions, payment-processing fees or message-delivery charges?"],
        ["Paid software", "Who pays renewals for any licensed tools or integrations?"],
      ], "Ask for annual totals as well as monthly prices. A one-off build does not make every supporting service free."),
      p("JovaMedia's optional Web Care starts at £39 per month, with up to 15 minutes of minor content updates. Web Care Pro is £99 per month, with up to 45 minutes and a monthly performance review. Hosting is separate. Unused edit time does not roll over; new pages and larger work are quoted separately."),
      p("For illustration, a £550 build plus twelve months of £39 care is £1,018 in the first year, before domain, hosting and any other agreed costs. That is simple package arithmetic, not a complete quote for every business."),
      h("before-paying", "Questions to ask before paying a deposit"),
      list([
        "Which pages and functions will you deliver, and what is outside the scope?",
        "What do I need to provide before work starts?",
        "How many revision rounds are included, and what counts as a scope change?",
        "What is the timeline once you have the required materials?",
        "Which accounts, files and licences will I own or control?",
        "What will I pay every month or year after launch?",
        "Who checks the enquiry route, redirects and mobile experience before the site goes live?",
      ]),
      h("small-start", "Start with the smallest website that does the job well"),
      p("If you have one offer and need one enquiry route, a landing page may be enough. If customers need to compare services, check your work and understand the business, a small multi-page site is usually easier to organise. Add a shop or custom booking system when there is a real requirement, not simply because the feature sounds useful."),
      p("You can [explore our website design service](/websites), [compare the published packages](/products/pricing) or [request a free homepage preview](/get-a-quote). Tell us the business, the main customer action and any essential features. We will confirm a practical scope before quoting."),
    ],
  },
  {
    slug: "website-for-lash-technicians",
    updatedAt: "2026-11-08",
    title: "Does a lash technician need a website? What clients need before they book.",
    seoTitle: "Websites for Lash Technicians: Booking, Prices & Trust",
    description: "A website guide for UK lash technicians: treatment prices, portfolio photos, infills, appointment policies and a clear route from Instagram to booking.",
    category: "Lash businesses", cover: "lashes", keyword: "website for lash technicians",
    summary: "Give a new client the information they need without another long exchange of messages.",
    answer: "A lash technician's website is useful when clients need a clearer place to compare treatments, prices, examples and appointment information. It can work alongside Instagram and an existing booking app. The first version can be small if it answers the right questions.",
    related: ["salon-website-with-instagram-and-booking-app", "small-business-website-cost-uk"],
    blocks: [
      p("A client likes a set of lashes on Instagram. The caption names a style, but the price is in a highlight, infill information is in an older post and the booking link opens a long list of treatments. They send a message. You reply after your final appointment. By then, they may have booked somewhere else."),
      p("A website can collect those answers in one place, with a booking link beside them. When the same question comes through again, you have a useful page to send."),
      h("first-visit", "Plan the page for someone booking their first appointment"),
      p("Regular clients already know your work and routine. A new client may not know whether to choose a full set, an infill or a removal and fresh application. Explain your actual services in plain language. Use your own policy for eligibility, timing and any required consultation; do not copy another technician's rules."),
      list([
        "A treatment menu with prices or honest starting prices, approximate appointment lengths and what each option includes.",
        "A gallery organised by the styles you actually offer, using client photographs with permission.",
        "Your working area, travel information and an appropriate level of address detail for a home studio.",
        "Your qualifications, experience and relevant insurance information where you can substantiate it.",
        "Your booking, deposit, cancellation and late-arrival policies in one easy-to-find place.",
        "A route to ask about suitability rather than guessing which appointment to buy.",
      ]),
      h("photos", "Let the photographs explain the service"),
      p("Show the work at a useful size on a phone. Label images with the style and service they illustrate. A large gallery of similar photographs is harder to navigate than a smaller selection with clear captions. Avoid stock lashes or someone else's work presented as your own."),
      p("Before-and-after photographs can help a visitor understand the difference between styles, but they should not promise that every client will get an identical result. Keep consent and image rights clear. Make the booking button easy to reach after the gallery."),
      h("booking", "An existing booking app can stay"),
      p("You do not need to replace a reliable calendar to have a professional website. A site can explain the services and link to the appropriate booking destination. A more integrated journey or custom booking panel may be useful later, but the first question is whether your current tool handles availability, deposits and messages correctly."),
      p("If new clients frequently ask what to choose, start with a short enquiry route. It is better to help someone pick the right service than make a complicated form that still leaves them unsure. Offer phone, WhatsApp or website chat where you can manage those channels reliably."),
      h("local-search", "Give local search useful facts"),
      p("Use your real service area, business name and contact details consistently. A page should explain what you offer and where a customer can receive it. Google says local results consider relevance, distance and prominence. Complete information helps, but there is no setting that guarantees a top position." , ["googleLocal"]),
      p("A Google Business Profile may also be relevant if you meet its in-person customer-contact requirements. A website alone does not establish eligibility, and a home business should check Google's address and service-area rules before publishing private location details." , ["googleBusiness"]),
      h("small-website", "What a small lash website could contain"),
      table(["Section", "Customer question"], [
        ["Introduction", "Who are you, what do you offer and where do you work?"],
        ["Treatments and prices", "Which service should I choose, and what will it cost?"],
        ["Your work", "Do I like the styles and finish you create?"],
        ["Booking information", "What should I know before choosing an appointment?"],
        ["Contact and booking", "Can I book now or ask a question first?"],
      ], "These can be sections of one focused page or part of a larger site, depending on the amount of useful information."),
      h("jovamedia", "Build around the way you actually work"),
      p("JovaMedia creates [salon and lash-business websites](/websites/salon-website-design) with clear treatment information and enquiry routes. A business website starts from £550. Connecting an existing booking tool and building a custom panel are different scopes, which we will explain before quoting."),
      p("Send your Instagram, treatment menu and current booking link with your [website enquiry](/get-a-quote). We can review the journey and show a free homepage preview before you commit."),
    ],
  },
  {
    slug: "salon-website-with-instagram-and-booking-app",
    updatedAt: "2026-11-08",
    title: "Does your salon need a website if Instagram and your booking app already work?",
    seoTitle: "Does a Salon Need a Website with Instagram & Booking Apps?",
    description: "See what a salon website adds alongside Instagram, Treatwell, Booksy or Fresha: clear treatment information, direct discovery and useful booking journeys.",
    category: "Salon websites", cover: "salon", keyword: "does a salon need a website",
    summary: "Keep what is working. Give clients a clearer home for the information that helps them choose.",
    answer: "A salon website can complement Instagram and a booking app by explaining treatments, showing the team and answering customer questions in one place. It is most useful when that information is hard to find today. You can keep the booking system that already works.",
    related: ["website-for-lash-technicians", "salon-booking-platform-fees-vs-own-website", "fresha-alternative-uk", "website-vs-social-media-google-business-profile"],
    blocks: [
      p("If your salon gets bookings through Instagram and a booking app, it is reasonable to ask what another website would achieve. 'Every business needs one' is not a useful answer. Look instead at the parts of a customer's decision that your current setup handles poorly."),
      p("Instagram is a useful place to see recent work. A booking app can be a good place to choose a time. Between those steps, a customer may still need to compare treatments, understand prices, find parking, choose a therapist or ask whether a service suits their needs. Your website can organise those answers."),
      h("missing-information", "Look for the missing information before buying a new site"),
      list([
        "Prices are spread across posts, highlights and old screenshots.",
        "The treatment names in the booking app make sense to staff but not to new customers.",
        "Visitors cannot easily compare your team, services or locations.",
        "Opening hours, access information and policies differ between profiles.",
        "Your phone gets repeated questions that a clear page could answer.",
        "The business has no useful page to send after a recommendation or local search.",
      ]),
      p("If none of these is a problem and the existing journey serves clients well, a large redesign may not be your next priority. A small site or a focused improvement can be enough."),
      h("different-jobs", "Give each channel a clear job"),
      table(["Channel", "Useful job", "What to connect"], [
        ["Instagram", "Show recent work, personality and updates.", "Link to the relevant treatment page or booking route."],
        ["Your website", "Explain services, prices, people, policies and reasons to choose you.", "Put booking and contact options beside that information."],
        ["Booking app", "Manage appointments and availability.", "Link back to useful service information where the tool permits it."],
        ["Google Business Profile", "Help eligible local customers find your business details and reviews.", "Keep the website, phone and hours consistent."],
      ], "The aim is one coherent journey. You do not have to replace every tool."),
      h("treatment-pages", "A useful treatment page does more than list a name"),
      p("Explain what the appointment includes, the price or pricing basis, its usual length and how to prepare according to your own practice. Show relevant photographs with permission. Include a consultation route where a client needs individual guidance. Keep clinical or safety advice within the qualifications of the person providing it."),
      p("For a larger salon, separate pages can make different services easier to understand. For a compact menu, a clear treatment page with sections may be simpler. The structure should follow the customer's questions, not an arbitrary target number of pages."),
      h("direct-discovery", "Your own website adds a direct address"),
      p("A domain gives the business a consistent destination for recommendations, search results, business cards and social profiles. It also gives you room to describe your own service in more detail. Keep the information up to date as treatments, prices and opening hours change."),
      p("Google's guidance is to create useful content for an intended audience and make it easy for people and search engines to understand. Copying the same salon description across several pages adds little. Use your own team, process and customer questions." , ["googleContent"]),
      h("booking-fees", "A website does not automatically remove booking fees"),
      p("Many platforms already distinguish direct customers from customers they introduce. The [booking-cost guide](/blog/salon-booking-platform-fees-vs-own-website) explains that difference. Keep acquisition commission, payment fees and software subscriptions separate when judging whether a custom panel is worth building."),
      h("first-version", "A practical first version"),
      p("Start with your services and prices, a selection of real work, team information, location details and a prominent booking button. Check everything on an ordinary phone. If you keep your existing calendar, test that the link opens the right business, location and treatment rather than a generic platform homepage."),
      p("JovaMedia can plan that journey around your current tools. Explore our [salon website design service](/websites/salon-website-design), [compare website prices](/products/pricing), or [request a free homepage preview](/get-a-quote). We will start with the missing information and the customer action you want to make easier."),
    ],
  },
  {
    slug: "small-business-website-launch-checklist",
    updatedAt: "2026-11-08",
    title: "Launching a small business website? Check the things customers will use.",
    seoTitle: "Small Business Website Launch Checklist | JovaMedia",
    description: "Check mobile layouts, forms, booking links, ownership, redirects, indexing and analytics before launching your small business website. A practical UK checklist.",
    category: "Launch & search", cover: "launch", keyword: "small business website launch checklist",
    summary: "A good-looking homepage is one part of the launch. Check the customer journey from start to finish.",
    answer: "Before launch, verify the offer, contact routes, mobile experience, ownership, redirects and search settings. Send a real test enquiry and confirm it reaches the right inbox. A successful build or a published sitemap does not prove the customer journey works.",
    related: ["small-business-website-cost-uk", "does-a-small-business-need-a-website", "small-business-website-brief-template"],
    blocks: [
      p("The website looks finished. The logo is sharp, the photographs are in place and the designer has sent a link. Before announcing it, walk through the tasks a real customer needs to complete. A broken form matters more than another round of decorative polish."),
      p("These checks apply to a focused business site as well as a larger project. Keep a simple record of what you tested, on which device and who owns the remaining work."),
      h("content", "Check the offer, facts and evidence"),
      list([
        "Can a new visitor explain what you do after reading the opening section? Name the service, intended customer and useful next step.",
        "Are prices, contact details, service areas, hours and policies consistent across the site and your business profiles? Remove placeholder copy and expired offers.",
        "Are portfolio images and testimonials accurate? Distinguish concepts from delivered work and obtain permission for customer photographs and feedback.",
      ]),
      h("customer-journey", "Complete the contact and booking journeys"),
      list([
        "Submit a test enquiry. Check the success message, destination inbox, reply address and any confirmation email. A successful button click is not proof of delivery.",
        "Test phone, email, WhatsApp and chat routes on a phone. Check that they open the correct destination and that someone can manage the channel.",
        "If appointments are offered, test the right service, staff member, availability and confirmation. Test payment-related flows in an agreed test environment before enabling real charges.",
      ]),
      h("mobile", "Use an ordinary phone"),
      list([
        "Check narrow screens for sideways scrolling, clipped headings and controls covered by chat or cookie banners.",
        "Read the services and prices without zooming. Check that buttons and form labels are clear and usable with a keyboard as well as touch.",
        "Try the site on a slower connection. Large images, excessive animation and third-party scripts can make a simple task feel slow.",
      ]),
      h("search", "Check how search engines will see the site"),
      list([
        "Give important pages descriptive titles, one clear main heading and useful links from other relevant pages. Make sure the live site does not retain a preview noindex setting.",
        "Check old URLs if this is a redesign. Redirect moved pages to the closest useful replacement and avoid redirect chains or broken links.",
        "Verify Search Console ownership, submit the production sitemap and inspect priority URLs. Discovery, indexing and ranking are separate stages.",
      ]),
      p("Google says repeated recrawl requests for the same URL will not make it crawl faster. Request a recrawl after meaningful changes, then allow processing time. A request is not an indexing guarantee." , ["googleIndex"]),
      h("handover", "Know who owns the next step"),
      list([
        "Confirm access to the domain, hosting, code and essential accounts. Record renewal dates without putting passwords into a shared public document.",
        "Verify analytics and consent behaviour. Separate test visits from actual visitors, and count a completed enquiry separately from a contact-button click.",
        "Agree who maintains the site, handles backups and responds when a form or integration stops working. Put recurring costs and support limits in writing.",
      ]),
      h("after-launch", "What to do after launch"),
      p("Check enquiries and customer questions first. Then review which pages attract relevant visits and whether those visitors reach the next step. Fix specific friction before adding more pages. Useful new content should answer a real question or explain a distinct service."),
      p("JovaMedia includes agreed launch checks in its [website design process](/websites). You can [compare build and care options](/products/pricing) or [tell us about an existing website](/contact). If you are planning a new site, our free homepage preview provides a practical starting point."),
    ],
  },
];

export const articles = baseArticles.map(article => {
  const { nextStep, ...refinement } = articleSearchRefinements[article.slug] || {};
  const revised = { ...article, ...refinement };
  return { ...revised, updatedAt: revised.answer ? [revised.updatedAt || revised.publishedAt || editorialDate, '2026-11-09'].sort().at(-1) : revised.updatedAt,
    blocks: nextStep ? [...revised.blocks, { type: 'paragraph', text: nextStep, sources: [] }] : revised.blocks };
});

export function articleBySlug(slug) { return articles.find(article => article.slug === slug); }
export function articleDates(article) {
  const publishedAt = article.publishedAt ?? editorialDate;
  return { publishedAt, updatedAt: article.updatedAt ?? publishedAt };
}
export function articleReadMinutes(article) {
  const words = JSON.stringify(article.blocks).split(/\s+/).length;
  return Math.max(3, Math.ceil(words / 220));
}
export function articleSchema(article, image) {
  const url = `https://www.jovamedia.com/blog/${article.slug}`;
  const { publishedAt, updatedAt } = articleDates(article);
  return {
    "@context": "https://schema.org", "@type": "BlogPosting", "@id": `${url}#article`,
    headline: article.title, description: article.description, ...(article.answer ? { abstract: article.answer } : {}),
    datePublished: publishedAt, dateModified: updatedAt,
    author: { "@type": "Organization", name: "JovaMedia", url: "https://www.jovamedia.com/about" },
    publisher: { "@id": "https://www.jovamedia.com/#organisation" },
    mainEntityOfPage: url, inLanguage: "en-GB", ...(image ? { image: [image] } : {}),
  };
}
