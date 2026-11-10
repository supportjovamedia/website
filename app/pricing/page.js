import StructuredData from "@/components/StructuredData";
import {pageMetadata} from "@/lib/seo";
import JovaBookPlans from "../jovabook/JovaBookPlans";
import {faqs} from "../jovabook/faqs.mjs";
import StoryFaq from "../jovabook/story/Faq";
import "../jovabook/landing.css";
import "../jovabook/story/story.css";
import "../jovabook/story/rhythm.css";
import "../jovabook/story/polish.css";
import "../jovabook/story/controls-finish.css";
import "../jovabook/story/calculator-finish.css";
import "../jovabook/story/content-finish.css";

export const metadata = pageMetadata("/pricing", "JovaBook Pricing | Free, Solo & Team", "Compare JovaBook plans. Start free with 20 monthly bookings and a one-page website, or choose Solo at £20/month or Team from £25/month. 0% booking commission on every plan.");

export default function PricingPage() {
  return <main className="jovabook-story jovabook-pricing-page">
    <div id="jova-story-concept">
      <div className="blend-sections">
        <JovaBookPlans headingLevel={1}/>
        <div id="ex-faq"><StoryFaq/></div>
      </div>
    </div>
    <StructuredData data={{"@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(({question, answer}) => ({"@type": "Question", name: question, acceptedAnswer: {"@type": "Answer", text: answer}}))}} />
  </main>;
}
