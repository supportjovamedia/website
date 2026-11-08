import Link from "next/link";
import {pageMetadata} from "@/lib/seo";
import styles from "./about.module.css";

export const metadata=pageMetadata(
 "/about",
 "About JovaMedia: London Websites & Booking Software",
 "JovaMedia is a London company that builds websites and JovaBook booking software for service businesses. Find out who we are and how we work.",
);

export default function AboutPage(){
 const schema={"@context":"https://schema.org","@type":"AboutPage","@id":"https://www.jovamedia.com/about#page",url:"https://www.jovamedia.com/about",name:"About JovaMedia and JovaBook",about:{"@id":"https://www.jovamedia.com/#organisation"}};
 return <main className={styles.page}>
  <section className={styles.hero} aria-labelledby="about-title">
   <div className={styles.inner}><p className={styles.eyebrow}>About JovaMedia</p><h1 id="about-title">The people behind<br/><span>your booking day.</span></h1><p className={styles.lead}>We’re a London company building software and websites for small businesses. JovaBook is our booking platform, bringing your appointments, website and client records into one place.</p><div className={styles.actions}><Link prefetch={false} href="/" className="btn">Explore JovaBook</Link><Link prefetch={false} href="/contact">Talk to our team</Link></div></div>
  </section>
  <section className={styles.story} aria-labelledby="why-title"><p className={styles.eyebrow}>Why we built JovaBook</p><div><h2 id="why-title">Less back and forth.<br/>More time with clients.</h2><p>Running an appointment business involves more than keeping a diary. There are services to organise, working hours to manage and clients who need a straightforward way to book.</p><p>We built JovaBook to bring those tasks together. Share your booking link, let clients choose an available time, and manage appointments from the same workspace as your services and client records. Every plan includes a one-page business website.</p></div></section>
  <section className={styles.approach} aria-labelledby="approach-title"><p className={styles.eyebrow}>Our approach</p><h2 id="approach-title">Useful tools, with room to grow.</h2><div className={styles.grid}>{[
   ["Start with what you need","JovaBook’s Free plan includes one staff calendar, 20 bookings and 50 emails each month. You can get started without entering a card."],
   ["Keep your day connected","Your booking page, website, services and diary work together, so clients can book through the same link you share on your website or social profiles."],
   ["Grow at your own pace","Solo adds unlimited monthly bookings and Stripe deposits. Team adds staff calendars and team logins, with extra seats available as your business grows."],
  ].map(([title,copy])=><article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
  <section className={styles.contact}><div><p className={styles.eyebrow}>Let’s talk</p><h2>A question about JovaBook?</h2><p>Whether you’re choosing a plan or getting your business set up, tell us what you need.</p></div><Link prefetch={false} className="btn" href="/contact">Contact JovaMedia</Link></section>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
 </main>;
}
