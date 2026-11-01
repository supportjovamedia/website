import ProductPackages from "@/components/ProductPackages";
import { pageMetadata } from "@/lib/seo";
import s from "./pricing.module.css";
import PhotoHero from "@/components/PhotoHero";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { FaqStory } from "@/components/ScrollStories";
import ConsultationLink from "@/components/ConsultationLink";
export const metadata = pageMetadata("/pricing", "Small Business Website Prices UK | From £350 | JovaMedia", "Compare JovaMedia website design prices: landing pages from £350, business websites from £550 and booking websites from £2,000. Scope and running costs explained.");
const pricingQuestions = [
  ["What is included in the website price?", "A landing page starts from £350, a four-page business website from £550 and a website with its own booking system from £2,000. Each includes responsive design, an enquiry route, search foundations and a review before launch. No VAT is charged on JovaMedia prices."],
  ["What could cost extra?", "Domain renewal, hosting, paid integrations, payment processing and message delivery can have separate costs. Extra pages, content production, migration and more complex functionality are quoted around the work required. Your written quote confirms what is included."],
  ["Do I need a custom booking panel?", <>You can keep a working booking platform and have a website that links to it. A custom panel is a different scope, useful when you need control over an agreed workflow. Read our <Link href="/blog/salon-booking-platform-fees-vs-own-website">booking cost comparison</Link> or explore <Link href="/websites/salon-website-design">salon website design</Link>.</>],
  ["Is monthly care compulsory?", "Web Care and Web Care Pro are optional plans for one website. Care starts at £39 per month; Pro is £99 per month. They include the stated minor-edit allowance. Hosting, new features, larger changes and emergency recovery are separate."],
  ["Can I see a direction before committing?", <>Yes. <Link href="/get-a-quote">Request a free homepage preview</Link> and tell us about your business. The offer is available through 31 December 2026, with a personalised preview within 48 hours. We confirm the full project scope and quote before you commit.</>],
  ["Will I own the finished website?", "Website and source-code ownership are included in the website packages. Your quote confirms handover, domain and hosting arrangements, plus the terms of any third-party software."],
];
export default function PricingPage() {
  return <main><PhotoHero image="pricing" className={`page-hero ${s.hero}`}><div className={s.container}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Website prices", path: "/pricing" }]}/><h1>Small business<br/>website prices.</h1><p>Choose a focused landing page, a business website or a website with booking. We agree the scope and separate running costs before work begins.</p><div className={s.heroActions}><ConsultationLink className="btn" placement="pricing">Get a Quote</ConsultationLink><a href="#website-packages" className={s.heroLink}>Compare website packages</a></div></div></PhotoHero><ProductPackages />
    <section className={s.planning} aria-labelledby="jovabook-price-title"><div className={s.planningInner}><div><h2 id="jovabook-price-title">JovaBook Essential.</h2><p>Online booking, one calendar and a one-page business website. £20 a month plus 1% commission on the full service price, counted when the appointment takes place.</p></div><div className={s.planningLinks}><Link href="/jovabook">Explore JovaBook and its three-day trial</Link></div></div></section>
    <section className={s.planning} aria-labelledby="pricing-guide-title"><div className={s.planningInner}><div><h2 id="pricing-guide-title">Before you compare quotes.</h2><p>Look at the pages, features, ownership and running costs together. A starting price only makes sense alongside the scope.</p></div><div className={s.planningLinks}><Link href="/blog/small-business-website-cost-uk">What a website quote should include</Link><Link href="/work/qaiser-watches">See the Qaiser Watches project</Link></div></div></section>
    <FaqStory items={pricingQuestions} contactHref="/get-a-quote" contactLabel="Get a Quote"/>
  </main>;
}
