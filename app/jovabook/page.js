import Link from "next/link";
import EssentialOffer from "./EssentialOffer";
import BookingPreview from "./BookingPreview";
import ProductDetails from "./ProductDetails";
import { FaqStory } from "@/components/ScrollStories";
import { jovabookMetadata, jovabookStructuredData } from "./search-data.mjs";
import s from "./jovabook.module.css";

export const metadata = jovabookMetadata();
const faqs = [
  {
    "question": "What can I use JovaBook for?",
    "answer": "JovaBook is online booking software for salons and other service businesses that book clients into timed appointments. Add the services you offer, their prices and durations, and the hours clients can book."
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
    "answer": "Annual subscriptions are paid upfront and cost 20% less than 12 monthly subscription payments. Essential and Standard also charge 1% of the full service price in the billing period when an appointment takes place. This commission is invoiced monthly, including on annual subscriptions. Premium has 0% booking commission."
  },
  {
    "question": "What happens after the 3-day trial?",
    "answer": "Your workspace trial starts when you register, including setup time. It does not automatically create a paid subscription. If you choose to subscribe, review the charge, billing frequency and terms in Stripe before confirming."
  },
  {
    "question": "Can I collect deposits online?",
    "answer": "Online deposit collection is not available yet. Connecting a payment-provider account does not currently enable checkout. You can use JovaBook to take bookings while collecting payment separately."
  }
];
const signup = "https://book.jovamedia.com/?portal=owner&plan=essential&cadence=monthly#signup";

export default function JovaBookPage() {
  return <main className={s.page}>
    <section className={s.hero} data-website-intro aria-labelledby="jovabook-title">
      <div className={s.heroInner}>
        <div className={s.heroCopy}>
          <p className={s.productName}><span className={s.bookMark} aria-hidden="true"><i /><i /></span>Meet JovaBook</p>
          <h1 id="jovabook-title">Online booking<br /><span>for your business.</span></h1>
          <p className={s.lead}>Let clients choose a service and a time. Keep bookings, client details and your business website together in JovaBook.</p>
          <div className={s.actions}><a className={s.primaryButton} href={signup}>Try JovaBook for free</a><a className={s.watchLink} href="#demo"><span className={s.playIcon} aria-hidden="true" />Watch the demo</a></div>
          <p className={s.startingPrice}>Essential from £20/month + 1% booking commission.</p>
        </div>
        <BookingPreview />
      </div>
    </section>
    <ProductDetails />
    <section id="demo" className={s.demo} aria-labelledby="demo-title">
      <div className={s.container}>
        <div className={s.demoPanel}>
          <div className={s.demoCopy}><span className={s.demoLabel}>A closer look</span><h2 id="demo-title">A booking.<br />A calmer day.</h2><p>See how JovaBook brings your bookings, calendar and clients together.</p><p className={s.demoDuration}><span className={s.playIcon} aria-hidden="true" />39 seconds with JovaBook</p></div>
          <figure className={s.videoFigure}><div className={s.videoFrame}><video className={s.video} controls playsInline preload="none" poster="/jovabook/demo-poster.webp" aria-label="JovaBook product film" aria-describedby="demo-caption"><source src="/jovabook/demo.mp4" type="video/mp4" />Your browser does not support video. <a href="/jovabook/demo.mp4">Watch the JovaBook product film</a>.</video></div><figcaption id="demo-caption">See JovaBook in action.</figcaption></figure>
        </div>
        <div className={s.emailNote}><span className={s.emailIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 6 9 7 9-7" /></svg></span><p><strong>A little nudge before the appointment.</strong> Booking emails and reminders are included when email delivery is activated. Check their delivery status in your workspace.</p></div>
      </div>
    </section>
    <section className={s.costs} aria-labelledby="costs-title"><div className={s.container}><div className={s.costsPanel}>
      <div><span className={s.costBadge}>No guesswork</span><h2 id="costs-title">Clear costs.<br />Before you commit.</h2><Link className={s.textLink} href="/contact">Talk through the costs with us</Link></div>
      <div className={s.costDetails}><div className={s.costExample}><p>For an eligible £50 appointment</p><div><strong>£50</strong><span>service price</span><b aria-hidden="true">×</b><strong>1%</strong><span>commission</span><b aria-hidden="true">=</b><strong>50p</strong><span>booking commission</span></div></div><p>On Essential and Standard, 1% booking commission uses the full service price when an appointment takes place. Commission is billed monthly, including on annual subscriptions. Payment-processing fees are separate.</p><p>Premium removes JovaBook booking commission. Compare the subscription and staff allowances below to choose the plan that fits your team and appointment value.</p><p>Your 3-day workspace trial starts at registration, including setup. It does not automatically create a paid subscription. Review the charge, billing frequency and terms in Stripe before confirming.</p></div>
    </div></div></section>
    <section id="plans" className={s.plans} aria-labelledby="plans-title"><div className={s.container}><header className={s.sectionIntro}><h2 id="plans-title">One owner today.<br />Room for your next chapter.</h2><p>Start on your own. Add room for a team when you need it.</p><p className={s.planAvailability}>Essential is available now. Talk to us about Standard and Premium before choosing a team plan.</p></header><EssentialOffer /></div></section>
    <div className={s.sharedFaq}><FaqStory items={faqs.map(({question,answer}) => [question,answer])} introduction="About bookings, plans and getting started." contactLabel="Ask the JovaMedia team" showArtwork={false} /></div>
    <section className={s.finalCta} aria-labelledby="start-title"><div className={s.container}><h2 id="start-title">More time for<br />what you do best.</h2><p>Give clients a booking link. Keep your diary, client records and business website in one workspace.</p><a className={s.primaryButton} href={signup}>Try JovaBook for free</a><p className={s.finalTerms}>Essential: £20/month + 1% booking commission.<br />3-day workspace trial starts at registration, including setup.</p></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jovabookStructuredData({faqs,video:{duration:"PT39S",uploadDate:"2026-11-01T00:00:00+00:00"}})).replace(/</g,"\\u003c")}} />
  </main>;
}
