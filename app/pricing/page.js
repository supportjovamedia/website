import ProductPackages from "@/components/ProductPackages";
import { pageMetadata } from "@/lib/seo";
import s from "@/components/Commerce.module.css";
import PhotoHero from "@/components/PhotoHero";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import e from "@/components/Editorial.module.css";
import { FaqStory } from "@/components/ScrollStories";
export const metadata = pageMetadata("/pricing", "Small Business Website Prices UK | From £350 | JovaMedia", "Compare JovaMedia website design prices: landing pages from £350, business websites from £550 and booking websites from £2,000. Scope and running costs explained.");
const pricingQuestions = [
  ["What is included in the website price?", "A landing page starts from £350, a four-page business website from £550 and a website with its own booking system from £2,000. Each includes responsive design, an enquiry route, search foundations and a review before launch. No VAT is charged on JovaMedia prices."],
  ["What could cost extra?", "Domain renewal, hosting, paid integrations, payment processing and message delivery can have separate costs. Extra pages, content production, migration and more complex functionality are quoted around the work required. Your written quote confirms what is included."],
  ["Do I need a custom booking panel?", <>You can keep a working booking platform and have a website that links to it. A custom panel is a different scope, useful when you need control over an agreed workflow. Read our <Link href="/insights/salon-booking-platform-fees-vs-own-website">booking cost comparison</Link> or explore <Link href="/services/salon-website-design">salon website design</Link>.</>],
  ["Is monthly care compulsory?", "Web Care and Web Care Pro are optional plans for one website. Care starts at £39 per month; Pro is £99 per month. They include the stated minor-edit allowance. Hosting, new features, larger changes and emergency recovery are separate."],
  ["Can I see a direction before committing?", <>Yes. <Link href="/get-a-quote">Request a free homepage preview</Link> and tell us about your business. The offer is available through 31 December 2026, with a personalised preview within 48 hours. We confirm the full project scope and quote before you commit.</>],
  ["Will I own the finished website?", "Website and source-code ownership are included in the website packages. Your quote confirms handover, domain and hosting arrangements, plus the terms of any third-party software."],
];
export default function PricingPage() {
  return <main><PhotoHero image="pricing" className={`${s.pageHero} ${s.pricingHero}`}><div className={s.container}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Website prices", path: "/pricing" }]}/><h1>Small business<br/>website prices.</h1><p>Choose a focused landing page, a business website or a website with booking. We agree the scope and separate running costs before work begins.</p></div></PhotoHero><ProductPackages />
    <section className={e.editorial} aria-label="Website planning guides"><div className={e.shell}><div className={`${e.caseText} ${e.prose}`}>
      <p>For a closer look at budgets and quote comparisons, read <Link href="/insights/small-business-website-cost-uk">what a small business website costs and what should be included</Link>. The <Link href="/work/qaiser-watches">Qaiser Watches case study</Link> shows a live project.</p>
    </div></div></section>
    <FaqStory items={pricingQuestions} contactHref="/get-a-quote" contactLabel="Get a Quote"/>
  </main>;
}
