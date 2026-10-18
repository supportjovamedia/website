import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import WebsiteVisual from "@/components/WebsiteVisual";
import { websiteTypes, websiteBySlug, websitePath, websiteQuotePath } from "@/lib/website-catalogue.mjs";
import { pageMetadata, siteUrl } from "@/lib/seo";
import s from "../websites.module.css";

export const dynamicParams = false;
export function generateStaticParams() { return websiteTypes.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }) {
  const item = websiteBySlug((await params).slug);
  return item ? pageMetadata(websitePath(item.slug), item.title, item.description) : {};
}

export default async function WebsiteTypePage({ params }) {
  const item = websiteBySlug((await params).slug);
  if (!item) notFound();
  const path = websitePath(item.slug);
  const quote = websiteQuotePath(item);
  return <main className={s.page}>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "Service", "@id": `${siteUrl}${path}#service`, url: siteUrl + path, name: item.title, description: item.description, serviceType: item.name, provider: { "@id": `${siteUrl}/#organisation` }, areaServed: { "@type": "Country", name: "United Kingdom" } }} />
    <section className={`${s.hero} ${s.detailHero}`} data-website-intro><div className={s.shell}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Websites", path: "/websites" }, { name: item.shortName, path }]} /><div className={s.heroGrid}><div><p className={s.eyebrow}>{item.name}</p><h1>{item.heading}</h1><p className={s.intro}>{item.intro}</p><div className={s.actions}><Link className={s.primary} href={quote}>Discuss your {item.group === "systems" ? "system" : "website"}</Link><a className={s.textLink} href="#scope">What we can include</a></div><p className={s.heroNote}>A UK project, with the scope and next steps agreed before the build.</p></div><figure className={s.heroArt}><WebsiteVisual type={item.visual} image={item.image} eager /><figcaption>{item.group === "systems" ? "Original interface study with illustrative information. The workflow is scoped for your business." : item.slug === "website-redesign" ? "Before-and-after layout study, not a client-results case study." : "Original design study using photography. Your website is designed around your own business."}</figcaption></figure></div></div></section>
    <nav className={s.jump} aria-label={`On this ${item.shortName.toLowerCase()} page`}><div className={s.shell}><a href="#fit">Is this the right fit?</a><a href="#scope">Scope</a><a href="#planning">Planning & costs</a><a href="#questions">Questions</a></div></nav>
    <div className={s.shell}>
      <section className={s.editorial} id="fit"><h2>{item.purposeTitle}</h2><div className={s.prose}><p>{item.purpose}</p><ul className={s.fitList}>{item.fit.map(text => <li key={text}>{text}</li>)}</ul></div></section>
      <section className={s.editorial} id="scope"><h2>The scope starts<br />with the useful parts.</h2><dl className={s.scopeList}>{item.scope.map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl></section>
      <section className={s.editorial}><h2>{item.decisionTitle}</h2><div className={s.prose}><p>{item.decision}</p>{item.slug === "business-websites" && <div className={s.industryLinks}><Link className={s.textLink} href="/services/salon-website-design">Explore salon website design</Link><Link className={s.textLink} href="/websites/booking-systems">Booking for salons & barbers</Link></div>}{item.slug === "bespoke-websites" && <Link className={s.textLink} href="/services/system-modernization">Explore systems & automation</Link>}{["ecommerce-websites", "portfolio-websites", "business-websites"].includes(item.slug) && <p><Link className={s.workLink} href="/work/qaiser-watches">Explore our Qaiser Watches client project</Link><span className={s.caption}><br />Retail website design and collection browsing. View the actual delivered scope.</span></p>}</div></section>
      <section className={s.editorial} id="planning"><h2>Before we<br />plan the build.</h2><div className={s.prose}><ul className={s.planList}>{item.planning.map(text => <li key={text}>{text}</li>)}</ul><p>{item.cost}</p><Link className={s.textLink} href="/pricing">See packages & inclusions</Link><br /><Link className={s.textLink} href="/insights/small-business-website-cost-uk">Understand website costs</Link></div></section>
      <section className={s.editorial} id="questions"><h2>Useful questions.<br />Clear answers.</h2><dl className={s.faqList}>{item.faq.map(([q, a]) => <div key={q}><dt>{q}</dt><dd>{a}</dd></div>)}</dl></section>
      <section className={s.section}><h2>Another way to start.</h2><div className={s.relatedGrid}>{item.related.map(slug => { const related = websiteBySlug(slug); return <Link key={slug} href={websitePath(slug)} className={s.relatedCard}><h3>{related.name}</h3><p>{related.summary}</p><span className={s.cardText}>Explore the option</span></Link>; })}</div></section>
    </div>
    <section className={s.finalCta}><div className={s.shell}><div><h2>Let us hear<br />what you have in mind.</h2><p>Share the requirement and your current setup. We can then agree the right scope and next step.</p></div><Link className={s.primary} href={quote}>Discuss your project</Link></div></section>
  </main>;
}
