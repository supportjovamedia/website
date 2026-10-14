import Image from "next/image";
import Link from "next/link";
import s from "./Editorial.module.css";
import MotionRegion from "./MotionRegion";
import InsightCover from "./InsightCover";

export default function ProjectAndGuides() {
  return <section className={`${s.editorial} ${s.homeEditorial}`} aria-label="Recent work and website advice"><MotionRegion className={s.shell} enterOnly>
    <article className={s.projectFeature}>
      <Link href="/work/qaiser-watches" className={s.projectImage} data-motion-card><div className={s.projectChrome} aria-hidden="true"><span><i/><i/><i/></span><span>qaiserwatches.com</span></div><Image src="/insights/qaiser-website.webp" alt="JovaMedia's live website design for Qaiser Watches" width={1400} height={856} sizes="(max-width:750px) 92vw, 580px" loading="lazy"/></Link>
      <div data-motion-card style={{"--card-delay":"80ms"}}><h2>Qaiser Watches.</h2><p>A custom website for a London watchmaker, with a collection that customers can explore on phone or desktop.</p><p>Qaiser was so pleased with the result that he offered to introduce us to other watch businesses. Our work together now includes social media management.</p><Link className={s.readLink} href="/work/qaiser-watches">Explore the project and client feedback</Link></div>
    </article>
    <section className={s.guideLinks} data-motion-card aria-labelledby="website-advice-title"><h2 id="website-advice-title">Planning your website?</h2><p>Start with the questions that affect your budget and the way customers book.</p><ul className={s.guideGrid}>{[{ cover: "cost", href: "/insights/small-business-website-cost-uk", title: "What does a small business website cost?" }, { cover: "booking", href: "/insights/salon-booking-platform-fees-vs-own-website", title: "Booking platform fees or your own booking website?" }, { cover: "salon", href: "/services/salon-website-design", title: "Website design for salons and lash businesses" }].map(guide => <li key={guide.href}><Link href={guide.href}><InsightCover kind={guide.cover} compact/><h3>{guide.title}</h3></Link></li>)}</ul><Link className={s.readLink} href="/insights">Browse all articles</Link></section>
  </MotionRegion></section>;
}
