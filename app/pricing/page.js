import ProductPackages from "@/components/ProductPackages";
import { pageMetadata } from "@/lib/seo";
import s from "./pricing.module.css";
import PhotoHero from "@/components/PhotoHero";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { FaqStory } from "@/components/ScrollStories";
import ConsultationLink from "@/components/ConsultationLink";
export const metadata = pageMetadata("/pricing", "JovaBook, Website & Webcare Prices | JovaMedia", "Compare free JovaBook Starter, Pro Solo at £20/month and Team from £25/month. Every plan has 0% booking commission. Explore websites and Webcare.");
const pricingQuestions = [
  ["How much does JovaBook cost?", "Starter is free for one staff calendar and up to 20 bookings per month. Pro Solo is £20/month with unlimited bookings. Pro Team is £25/month including one staff seat, plus £6/month per extra seat. All plans have 0% booking commission. Stripe processing fees are separate."],
  ["Can I pay annually for JovaBook?", "Yes. Pro Solo is £192/year. Pro Team is £240/year including one seat, plus £57.60/year for each extra seat. Paid upfront, that saves 20% against twelve monthly payments. Message allowances reset monthly. Stripe processing fees are separate."],
  ["What is included in the website price?", "A landing page starts from £350, a four-page business website from £550 and a website with its own booking system from £2,000. Each includes responsive design, an enquiry route, search foundations and a review before launch. No VAT is charged on JovaMedia prices."],
  ["What could cost extra?", "Domain renewal, hosting, paid integrations, payment processing and message delivery can have separate costs. Extra pages, content production, migration and more complex functionality are quoted around the work required. Your written quote confirms what is included."],
  ["Do I need a custom booking panel?", <>You can keep a working booking platform and have a website that links to it. A custom panel is a different scope, useful when you need control over an agreed workflow. Read our <Link href="/blog/salon-booking-platform-fees-vs-own-website">booking cost comparison</Link> or explore <Link href="/websites/salon-website-design">salon website design</Link>.</>],
  ["Is monthly care compulsory?", "Web Care and Web Care Pro are optional plans for one website. Care starts at £39 per month; Pro is £99 per month. They include the stated minor-edit allowance. Hosting, new features, larger changes and emergency recovery are separate."],
  ["Can I see a direction before committing?", <>Yes. <Link href="/get-a-quote">Request a free homepage preview</Link> and tell us about your business. The offer is available through 31 December 2026, with a personalised preview within 48 hours. We confirm the full project scope and quote before you commit.</>],
  ["Will I own the finished website?", "Website and source-code ownership are included in the website packages. Your quote confirms handover, domain and hosting arrangements, plus the terms of any third-party software."],
];
export default function PricingPage() {
  return <main><PhotoHero image="pricing" className={`page-hero ${s.hero}`}><div className={s.container}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]}/><h1>JovaBook plans,<br/>websites and care.</h1><p>Start with JovaBook for free, with 0% booking commission on every plan. Explore paid upgrades, website projects and ongoing Webcare below.</p><div className={s.heroActions}><a className="btn" href="#website-packages">Choose your JovaBook plan</a><ConsultationLink className={s.heroLink} placement="pricing">Talk to JovaMedia</ConsultationLink></div></div></PhotoHero><ProductPackages includeJovaBook />
    <section className={s.planning} aria-labelledby="pricing-guide-title"><div className={s.planningInner}><div><h2 id="pricing-guide-title">Before you compare quotes.</h2><p>Look at the pages, features, ownership and running costs together. A starting price only makes sense alongside the scope.</p></div><div className={s.planningLinks}><Link href="/blog/small-business-website-cost-uk">What a website quote should include</Link><Link href="/work/qaiser-watches">See the Qaiser Watches project</Link></div></div></section>
    <FaqStory items={pricingQuestions} contactHref="/get-a-quote" contactLabel="Get a Quote"/>
  </main>;
}
