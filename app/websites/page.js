import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import WebsiteVisual from "@/components/WebsiteVisual";
import { websiteTypes, websitePath } from "@/lib/website-catalogue.mjs";
import { pageMetadata, siteUrl } from "@/lib/seo";
import s from "./websites.module.css";

export const metadata = pageMetadata("/websites", "Website Design in Harrow & London | JovaMedia", "Website design for small businesses in Harrow, London and across the UK. Explore landing pages, business websites, ecommerce, booking systems and custom builds.");

function TypeCard({ item }) {
  return <Link href={websitePath(item.slug)} className={s.card}><div className={s.cardVisual}><WebsiteVisual type={item.visual} image={item.image} /></div><div className={s.cardContent}><h3>{item.name}</h3><p>{item.summary}</p><span className={s.cardText}>Explore {item.shortName.toLowerCase()}</span></div></Link>;
}

export default function WebsitesPage() {
  return <main className={s.page}>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "ItemList", name: "JovaMedia websites and business systems", itemListElement: websiteTypes.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: siteUrl + websitePath(item.slug) })) }} />
    <section className={s.hero} data-website-intro><div className={s.shell}>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Websites", path: "/websites" }]} />
      <div className={s.heroGrid}><div><p className={s.eyebrow}>Website design, shaped around you.</p><h1>Websites built around your business.</h1><p className={s.intro}>A simple first site. An online shop. A booking system with room to grow. Find the right starting point, then make it your own.</p><div className={s.actions}><Link className={s.primary} href="/get-a-quote">Tell us what you need</Link><a className={s.textLink} href="#website-types">Explore the options</a></div><p className={s.heroNote}>London-based, working with businesses in Harrow and across the UK. Clear scope, considered design and ownership explained.</p></div><figure className={s.heroArt}><WebsiteVisual type="business" image="architecture" eager /><figcaption>An original website layout study using photography. Explore our real client work below.</figcaption></figure></div>
    </div></section>
    <nav className={s.jump} aria-label="Explore website options"><div className={s.shell}><a href="#website-types">Types of websites</a><a href="#business-systems">Booking, CRM & portals</a><a href="#website-work">Our work</a><Link href="/pricing">Packages & pricing</Link></div></nav>
    <section className={s.section} id="website-types"><div className={s.shell}><header className={s.sectionHeader}><h2>A website for what<br />comes next.</h2><p>Start with the job your website needs to do. Each option has its own page, with useful detail about the scope, decisions and next steps.</p></header><div className={s.cards}>{websiteTypes.filter(item => item.group === "websites").map(item => <TypeCard key={item.slug} item={item} />)}</div></div></section>
    <section className={`${s.section} ${s.systemSection}`} id="business-systems"><div className={s.shell}><header className={s.sectionHeader}><h2>More than<br />the public pages.</h2><p>Make the work behind the website easier to manage. Booking, CRM, portals and memberships have different jobs. We scope each around the people using it.</p></header><div className={s.systemCards}>{websiteTypes.filter(item => item.group === "systems").map(item => <TypeCard key={item.slug} item={item} />)}</div><p className={`${s.caption} ${s.spaced}`}>Interface studies show possible layouts using illustrative information. Features and integrations are agreed for each project.</p></div></section>
    <section className={s.workBand} id="website-work"><div className={`${s.shell} ${s.workGrid}`}><div><p className={s.eyebrow}>Real work, with a clear brief.</p><h2>A collection,<br />worth exploring.</h2><p>For Qaiser Watches, we designed and built a retail website around its watch collection, product details and browsing experience. Explore the delivered scope and the live project.</p><Link className={s.workLink} href="/work/qaiser-watches">Explore Qaiser Watches</Link><div className={s.industryLinks}><Link className={s.textLink} href="/services/salon-website-design">Salon & beauty websites</Link><Link className={s.textLink} href="/websites/business-websites">Websites for service businesses</Link></div></div><figure className={s.heroArt}><div className={s.clientImage}><Image src="/home-selected/qaiser-watches.png" alt="Qaiser Watches client website with product photography and watch collection browsing" width={1440} height={4853} sizes="(max-width:760px) 90vw, 550px" /></div><figcaption>Client website: Qaiser Watches. A retail catalogue and product-browsing project.</figcaption></figure></div></section>
    <section className={s.decisionBand}><div className={`${s.shell} ${s.decisionGrid}`}><h2>You do not need<br />every feature at once.</h2><div><p>A salon or barber may need a clear business website and its existing booking link. A shop may need ecommerce. A growing team may need a custom CRM. Start with the useful part, and agree the additions when they make sense.</p><Link className={s.textLink} href="/pricing">Compare the website packages</Link><br /><Link className={s.textLink} href="/insights/small-business-website-cost-uk">Understand build and running costs</Link></div></div></section>
    <section className={s.finalCta}><div className={s.shell}><div><h2>What should your<br />website do next?</h2><p>Share the idea, your current site or the problem you want to solve. We will help define a useful starting point.</p></div><Link className={s.primary} href="/get-a-quote">Discuss your website</Link></div></section>
  </main>;
}
