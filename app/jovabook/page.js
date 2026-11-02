import EssentialOffer from "./EssentialOffer";
import BookingPreview from "./BookingPreview";
import BusinessTypes from "./BusinessTypes";
import BookingPartner from "./BookingPartner";
import ProductStory from "./ProductStory";
import StoryMotion from "./StoryMotion";
import { FaqStory } from "@/components/ScrollStories";
import { jovabookMetadata, jovabookStructuredData } from "./search-data.mjs";
import s from "./story.module.css";

export const metadata = jovabookMetadata();
const faqs = [
  {
    "question": "Why should I use JovaBook?",
    "answer": "JovaBook gives clients a way to book online while you manage your diary, services and client records in one workspace. Essential also includes a business website, so clients can learn about your business and find your booking link."
  },
  {
    "question": "How do clients book with my business?",
    "answer": "Share your business booking link. A client chooses a service and an available date and time, enters their details and reviews the booking before confirming. The booking appears in your business calendar."
  },
  {
    "question": "Can I set different hours for each day?",
    "answer": "Yes. Set opening hours for each day and mark closed days in Business details. You can also leave time between bookings. Standard and Premium support individual working hours for team members."
  },
  {
    "question": "Does a website come with Essential?",
    "answer": "Yes. Essential includes a one-page business website with your hero image, introduction, opening hours, contact details and booking link. Change your image and introduction in Personalise, and your opening hours and contact information in Business details."
  },
  {
    "question": "Which plan do I need for my team?",
    "answer": "Essential is for one owner. Standard supports up to 5 staff and includes Insights. Premium supports up to 10 staff and has 0% booking commission. Talk to us about Standard or Premium before choosing a team plan."
  },
  {
    "question": "How do annual billing and commission work?",
    "answer": "Annual subscriptions are paid upfront and cost 20% less than 12 monthly subscription payments. Essential and Standard also charge 1% of the full service price in the billing period when an appointment takes place. This commission is invoiced monthly, including on annual subscriptions. Premium has 0% booking commission. Payment-processing fees, where applicable, are separate."
  },
  {
    "question": "What happens after the 3-day trial?",
    "answer": "Your workspace trial starts when you register, including setup time. It does not automatically create a paid subscription. If you choose to subscribe, review the charge, billing frequency and terms in Stripe before confirming."
  },
  {
    "question": "Can clients book through Instagram, and can I take deposits?",
    "answer": "You can share your JovaBook booking link in your Instagram bio or messages. Clients follow that link to book on your page. A native Instagram Book Now integration is not available. Online deposit collection is also not available yet; connecting a payment-provider account does not currently enable customer checkout."
  }
];
const signup = "#plans";

export default function JovaBookPage() {
  return <main className={s.page}>
    <StoryMotion>
      <section className={s.hero} aria-labelledby="jovabook-title">
        <div className={s.heroInner}>
          <div className={s.heroCopy}>

            <h1 id="jovabook-title">Online booking<br />software <span>for your business.</span></h1>
            <div className={s.yellowRule} />
            <p className={s.lead}>Let clients choose a service and a time. Keep your bookings, client details and business website together, so you can get on with the day.</p>
            <div className={s.actions}><a className={s.primaryButton} href={signup}>Try JovaBook for free</a><a className={s.watchLink} href="https://book.jovamedia.com/login">Log in</a></div>
          </div>
          <BookingPreview />
        </div>
      </section>
      <section id="demo" className={s.demo} aria-labelledby="demo-title"><div className={s.container}>
        <header className={s.sectionHeading}><h2 id="demo-title">Everything your salon needs to take bookings and grow.</h2><p>Take a closer look at the tools inside JovaBook, one by one.</p><p>The film also previews text reminders and slot recovery, which are being prepared for team plans.</p></header>
        <div className={s.videoStage} data-card-group><figure className={s.videoFigure} data-story-card><video className={s.video} controls playsInline preload="none" poster="/jovabook/demo-poster.webp" aria-label="JovaBook product film"><source src="/jovabook/demo.mp4" type="video/mp4" />Your browser does not support video. <a href="/jovabook/demo.mp4">Watch the JovaBook product film</a>.</video></figure></div>
      </div></section>
      <BookingPartner />
      <ProductStory />
      <BusinessTypes />
      <section id="plans" className={s.plans} aria-labelledby="plans-title"><div className={s.container}>
        <header className={s.sectionHeading}><h2 id="plans-title">Find the right plan for your business.</h2><p>Start with the tools for your own diary. Choose more room when you need a team.</p></header>
        <EssentialOffer />

      </div></section>
      <div className={s.sharedFaq}><FaqStory items={faqs.map(({question,answer}) => [question,answer])} introduction="About bookings, your website, plans and getting started." contactLabel="Ask the JovaMedia team" showArtwork={false} /></div>
      <section className={s.finalCta} aria-labelledby="start-title"><div className={s.container}><div><h2 id="start-title">Start taking bookings with JovaBook.</h2><p>Create your booking page, add your services and choose your working hours. Try the workspace for free.</p></div><div className={s.finalAction}><a className={s.primaryButton} href={signup}>Try JovaBook for free</a></div></div></section>
    </StoryMotion>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jovabookStructuredData({faqs,video:{duration:"PT1M42S",uploadDate:"2026-11-01T00:00:00+00:00"}})).replace(/</g,"\\u003c")}} />
  </main>;
}
