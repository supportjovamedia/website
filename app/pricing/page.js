import PhotoHero from "@/components/PhotoHero";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import {FaqStory} from "@/components/ScrollStories";
import {pageMetadata} from "@/lib/seo";
import JovaBookPlans from "../jovabook/JovaBookPlans";
import {faqs} from "../jovabook/faqs.mjs";
import "../jovabook/landing.css";
import "../jovabook/pricing.css";

export const metadata = pageMetadata("/pricing", "JovaBook Pricing | Free Starter, Pro Solo & Pro Team", "Compare JovaBook plans. Start free with 20 monthly bookings and a one-page website, or choose Pro Solo at £20/month or Pro Team from £25/month. 0% booking commission on every plan.");

export default function PricingPage() {
  return <main>
    <PhotoHero image="pricing" className="page-hero">
      <div className="shell">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]} />
        <h1>JovaBook plans.<br />Start free, grow when you are ready.</h1>
        <p className="lead">Every plan has 0% booking commission. Starter is free and never asks for a card.</p>
      </div>
    </PhotoHero>
    <div className="ws">
      <section className="section plans-section free-pricing" id="plans" aria-labelledby="plans-title">
        <div className="wrap">
          <div className="section-head center">
            <h2 id="plans-title">Choose your plan.</h2>
            <p>A one-page website and online bookings, free. Add Stripe deposits, text reminders and more staff when you upgrade.</p>
          </div>
          <JovaBookPlans />
        </div>
      </section>
      <div id="questions" className="ws-original-faq">
        <FaqStory items={faqs.map(({question, answer}) => [question, answer])} introduction="About plans, allowances and getting started." contactHref="/contact" contactLabel="Ask the JovaMedia team" showArtwork={false} />
      </div>
    </div>
    <StructuredData data={{"@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(({question, answer}) => ({"@type": "Question", name: question, acceptedAnswer: {"@type": "Answer", text: answer}}))}} />
  </main>;
}
