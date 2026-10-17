import ProductPackages from "@/components/ProductPackages";
import { pageMetadata } from "@/lib/seo";
import s from "./pricing.module.css";
import PhotoHero from "@/components/PhotoHero";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { FaqStory } from "@/components/ScrollStories";
import ConsultationLink from "@/components/ConsultationLink";
export const metadata = pageMetadata("/pricing", "Small Business Web Design Packages & Prices | JovaMedia", "Compare UK website design packages: landing pages from £350, four-page business websites from £550 and booking websites from £2,000. See scope and running costs.");
const pricingQuestions = [
  ["Which website package fits my business?", "Choose a landing page when customers need one focused offer and an enquiry route. The four-page Business Website gives you separate Home, About, Services and Contact pages. Choose a Website with Booking System when you need your own appointment workflow. If an existing booking platform already works for you, a website that links to it may be enough; we agree any integration separately."],
  ["What is included in the website price?", "A landing page starts from £350, a four-page business website from £550 and a website with its own booking system from £2,000. Each includes responsive design, an enquiry route, search foundations and a review before launch. No VAT is charged on JovaMedia prices."],
  ["What could cost extra?", "Domain renewal, hosting, paid integrations, payment processing and message delivery can have separate costs. Extra pages, content production, migration and more complex functionality are quoted around the work required. Your written quote confirms what is included."],
  ["Do I need a custom booking panel?", <>You can keep a working booking platform and have a website that links to it. A custom panel is a different scope, useful when you need control over an agreed workflow. Read our <Link href="/insights/salon-booking-platform-fees-vs-own-website">booking cost comparison</Link> or explore <Link href="/services/salon-website-design">salon website design</Link>.</>],
  ["Is monthly care compulsory?", "Web Care and Web Care Pro are optional plans for one website. Care starts at £39 per month; Pro is £99 per month. They include the stated minor-edit allowance. Hosting, new features, larger changes and emergency recovery are separate."],
  ["Can I see a direction before committing?", <>Yes. <Link href="/get-a-quote">Request a free homepage preview</Link> and tell us about your business. The offer is available through 31 December 2026, with a personalised preview within 48 hours. We confirm the full project scope and quote before you commit.</>],
  ["Will I own the finished website?", "Website and source-code ownership are included in the website packages. Your quote confirms handover, domain and hosting arrangements, plus the terms of any third-party software."],
  ["Does a website package include SEO?", <>Search engine friendly foundations are included. A website package does not guarantee indexing, a particular Google position or enquiries. Useful content, competition and your website&apos;s reputation also matter. Our <Link href="/insights/small-business-website-cost-uk">website cost guide</Link> explains what to ask about SEO when comparing quotes.</>],
];
export default function PricingPage() {
  return <main><PhotoHero image="pricing" className={`page-hero ${s.hero}`}><div className={s.container}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Website packages", path: "/pricing" }]}/><h1>Small business<br/>website packages.</h1><p>Compare UK website design packages: a landing page from £350, a four-page business website from £550 or a website with its own booking system from £2,000. We agree the scope and separate running costs before work begins.</p><div className={s.heroActions}><ConsultationLink className="btn" placement="pricing">Get a Quote</ConsultationLink><a href="#website-packages" className={s.heroLink}>Compare website packages</a></div></div></PhotoHero><ProductPackages />
    <section className={s.planning} aria-labelledby="pricing-guide-title"><div className={s.planningInner}><div><h2 id="pricing-guide-title">Before you compare quotes.</h2><p>Start with what customers need to do: understand one offer, explore your services or book an appointment. Then compare the pages, features, ownership and running costs. A starting price only makes sense alongside the scope.</p></div><div className={s.planningLinks}><Link href="/insights/small-business-website-cost-uk">What a website quote should include</Link><Link href="/services/web-design">How we plan and build your website</Link><Link href="/work/qaiser-watches">See the Qaiser Watches project</Link></div></div></section>
    <FaqStory items={pricingQuestions} contactHref="/get-a-quote" contactLabel="Get a Quote"/>
  </main>;
}
