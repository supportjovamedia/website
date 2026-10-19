import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import MotionRegion from "@/components/MotionRegion";
import WebsiteRail from "@/components/WebsiteRail";
import { WebsitePhotoComposition } from "@/components/WebsitePhotography";
import { WebsiteTypeCard, WebsiteClientWork, WebsiteFinalCta } from "@/components/WebsitePageParts";
import { websiteTypes, websitePath } from "@/lib/website-catalogue.mjs";
import { websiteOverviewPhotos } from "@/lib/website-media.mjs";
import { pageMetadata, siteUrl } from "@/lib/seo";
import s from "./websites.module.css";

export const metadata = pageMetadata("/websites", "Affordable Website Design in London | JovaMedia", "Affordable website design in London and across the UK. Explore landing pages, ecommerce websites, bespoke builds, booking systems and CRM development.");

function TypeSection({ id, title, copy, group, tone = "" }) {
  const items = websiteTypes.filter(item => item.group === group);
  return <section id={id} className={`${s.section} ${tone}`}><div className={s.shell}>
    <header className={s.sectionHeader} data-site-reveal><h2>{title}</h2><p>{copy}</p></header>
    <WebsiteRail items={items.map(item => item.name)} label={group === "websites" ? "Website types" : "Business systems"} id={id}>{items.map(item => <WebsiteTypeCard key={item.slug} item={item} />)}</WebsiteRail>
  </div></section>;
}

export default function WebsitesPage() {
  return <main className={s.page}>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "ItemList", name: "JovaMedia website design and business systems", itemListElement: websiteTypes.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: siteUrl + websitePath(item.slug) })) }} />
    <MotionRegion>
      <section className={s.hero} data-website-intro><div className={s.shell}>
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Websites", path: "/websites" }]} />
        <div className={s.heroGrid}><div className={s.heroCopy}><h1>Affordable website design in London.</h1><p className={s.intro}>A first website. An ecommerce shop. A better way to book. We design and build affordable websites around your business, your customers and what comes next.</p><p className={s.heroNote}>Working with businesses in London and across the UK. Clear scope, considered design and ownership explained.</p></div><WebsitePhotoComposition photos={websiteOverviewPhotos} /></div>
      </div></section>
      <nav className={s.jump} aria-label="Explore website options"><div className={s.shell}><a href="#website-types">Website design</a><a href="#business-systems">Booking, CRM & portals</a><a href="#website-work">Client work</a><a href="#find-your-website">Something else?</a></div></nav>
      <TypeSection id="website-types" title="A website for the way you do business." copy="Start with what customers need to understand or do. These website types have different jobs, with their own pages to help you choose the right starting point." group="websites" />
      <TypeSection id="business-systems" title="The work behind your website, made clearer." copy="Booking manages appointments. A CRM helps your team manage clients. Portals and memberships give people access to the information or services they need. These interface design concepts use sample data; your features are agreed in the project scope." group="systems" tone={s.systemBand} />
      <WebsiteClientWork />
      <section className={s.section}><div className={`${s.shell} ${s.fitGrid}`}><h2>Website design for your business, wherever you are starting.</h2><div className={s.fitCopy}><p>For a salon or barber, the priority might be treatments, prices and a booking route. A shop needs clear products and an agreed purchase journey. A professional practice may need service explanations, work examples and a useful enquiry form.</p><p>We work with businesses in London and across the UK. The brief starts with your real services and customers, followed by the pages, content and functions that help them. We agree what to keep from your current setup and what needs to change.</p><div className={s.inlineLinks}><Link className={s.textLink} href="/websites/salon-website-design">Salon & beauty website design</Link><Link className={s.textLink} href="/websites/business-websites">Business website design</Link><Link className={s.textLink} href="/about">Get to know JovaMedia</Link></div></div></div></section>
      <section className={s.section}><div className={`${s.shell} ${s.fitGrid}`}><h2>Thoughtful design.<br />Practical foundations.</h2><div className={s.fitCopy}><p>Your website should be clear on a phone, easy to navigate and useful before someone gets in touch. We plan responsive layouts, readable headings, appropriate image sizes and the contact or booking journey agreed in your brief.</p><p>Search titles, useful page content and internal links are part of that foundation. We also consider existing addresses when redesigning a site. After launch, search visibility and real enquiries need to be measured; a new website does not come with a guaranteed ranking.</p><div className={s.inlineLinks}><Link className={s.textLink} href="/insights/small-business-website-cost-uk">Understand website build and running costs</Link><Link className={s.textLink} href="/websites/website-redesign">Plan a website redesign</Link></div></div></div></section>
      <WebsiteFinalCta id="find-your-website" title="Can't find the website you need?" description="Tell us what you have in mind, even if it isn't listed here. Share your requirements and get a quote for your project." actionLabel="Get a quote" />
    </MotionRegion>
  </main>;
}
