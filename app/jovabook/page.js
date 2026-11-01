import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";
import s from "./jovabook.module.css";
import EssentialOffer from "./EssentialOffer";

export const metadata = pageMetadata("/jovabook", "JovaBook Essential | £20 Monthly Booking Software | JovaMedia", "Online bookings, one calendar, clients, services and a one-page business website. JovaBook Essential is £20 a month plus 1% booking commission, with a three-day workspace trial.");

export default function JovaBookPage() {
 return <main className={s.page}>
  <section className={s.hero} data-website-intro><div className={s.container}>
   <Breadcrumbs items={[{name:"Home",path:"/"},{name:"JovaBook",path:"/jovabook"}]}/>
   <div className={s.intro}><div><p className={s.eyebrow}>JovaBook Essential</p><h1>Your bookings,<br/>in one place.</h1><p className={s.lead}>Let clients book online. Keep your appointments, services and client details together in a simple workspace for one person.</p><p className={s.trial}>Try the workspace free for 3 days. Your trial starts when you register, including setup time.</p></div>
    <EssentialOffer/>
   </div>
  </div></section>
  <section className={s.details}><div className={s.container}><h2>What’s included.</h2><ul className={s.features}>
   <li><h3>Online booking and one calendar</h3><p>A booking link for your clients, with day, week and month views for one staff member.</p></li>
   <li><h3>Clients and services</h3><p>Keep contact details, service prices, durations and working hours in your business workspace.</p></li>
   <li><h3>Your business website</h3><p>A one-page website with your introduction, booking link, opening hours and contact details.</p></li>
   <li><h3>Email reminders</h3><p>Booking emails and reminders when email delivery is activated, with delivery status in your workspace.</p></li>
  </ul></div></section>
  <section className={s.costs}><div className={s.container}><h2>Clear costs before you subscribe.</h2><p>Choose £20 a month or £192 a year paid upfront, equivalent to £16 a month and 20% off. Both options add 1% commission on the full service price, billed monthly. For example, an eligible £50 appointment adds 50p commission, whether its deposit is £0 or £10.</p><p>Appointments count in the monthly commission period when they take place. Future appointments count in their appointment period. Unbilled commission carries forward until successfully charged. Stripe processing fees are separate.</p><p>Your three-day workspace trial does not automatically create a paid subscription. If you choose to subscribe, review the charge, billing frequency and terms in Stripe before confirming.</p><div className={s.actions}><a className="btn" href="#essential-plan">Choose Essential billing</a><Link href="/contact">Ask us a question</Link></div></div></section>
 </main>;
}
