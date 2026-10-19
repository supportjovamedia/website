import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import MotionRegion from "@/components/MotionRegion";
import WebsiteStory from "@/components/WebsiteStory";
import { WebsitePhoto, WebsitePhotoComposition } from "@/components/WebsitePhotography";
import { WebsiteRelated, WebsiteClientWork, WebsiteFinalCta } from "@/components/WebsitePageParts";
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
    <MotionRegion>
      <section className={s.hero} data-website-intro><div className={s.shell}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Websites", path: "/websites" }, { name: item.shortName, path }]} /><div className={s.heroGrid}><div className={s.heroCopy}><h1>{item.heading}</h1><p className={s.intro}>{item.intro}</p><div className={s.actions}><Link className={s.primary} href={quote}>Discuss your {item.group === "systems" ? "system" : "website"}</Link><a className={s.secondary} href="#scope">Explore the scope</a></div><p className={s.heroNote}>Designed for businesses across the UK. Scope, ownership and next steps agreed before the build.{item.group === "systems" && " Interface concepts shown with sample data."}</p></div>{item.group === "systems" ? <div className={s.systemHero}><WebsitePhoto name={item.heroPhotos[0]} eager sizes="(max-width:900px) 90vw, 48vw" /></div> : <WebsitePhotoComposition photos={item.heroPhotos} />}</div></div></section>
      <nav className={s.jump} aria-label={`On this ${item.shortName.toLowerCase()} page`}><div className={s.shell}><a href="#fit">Is this the right fit?</a><a href="#scope">Features & scope</a><a href="#planning">Planning & costs</a><a href="#questions">Your questions</a></div></nav>
      <section className={s.section} id="fit"><div className={`${s.shell} ${s.fitGrid}`}><h2>{item.fitTitle}</h2><div className={s.fitCopy}><p>{item.purpose}</p><ul className={s.fitList}>{item.fit.map(text => <li key={text}>{text}</li>)}</ul></div></div></section>
      <WebsiteStory title={item.scopeTitle} introduction={item.storyTitle} names={item.scope.map(([title]) => title)}>
        {item.scope.map(([title, text], index) => <article key={title} className={s.storyArticle}><div className={s.storyPhoto}><WebsitePhoto name={item.storyPhotos[index]} sizes="(max-width:900px) 84vw, 48vw" /></div><div className={s.storyCopy}><h3>{title}</h3><p>{text}</p><p className={s.fitPoint}>{item.storyNotes[index]}</p></div></article>)}
      </WebsiteStory>
      <div className={`${s.shell} ${s.detailContent}`}>
        {item.detailSections.map((section, index) => <section key={section.title} className={s.editorialBlock}><div className={s.editorialPhoto} data-motion-card><WebsitePhoto name={item.editorialPhotos[index]} sizes="(max-width:900px) 90vw, 45vw" /></div><div className={s.editorialCopy}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></section>)}
        <section className={s.decision}><h2>{item.decisionTitle}</h2><div><p>{item.decision}</p>{item.slug === "business-websites" && <div className={s.inlineLinks}><Link className={s.textLink} href="/websites/salon-website-design">Salon website design</Link><Link className={s.textLink} href="/websites/booking-systems">Booking systems for salons & barbers</Link></div>}{item.slug === "booking-systems" && <div className={s.inlineLinks}><Link className={s.textLink} href="/websites/salon-website-design">Website design for salons</Link><Link className={s.textLink} href="/insights/salon-booking-platform-fees-vs-own-website">Booking platform fees and website ownership</Link></div>}{item.slug === "bespoke-websites" && <Link className={s.textLink} href="/services/system-modernization">Explore systems & automation</Link>}</div></section>
      </div>
      <section className={s.planningBand} id="planning"><div className={`${s.shell} ${s.planningGrid}`}><div><h2>{item.planningTitle}</h2><p>A useful brief makes the quote clearer. Share what you have, what customers need to do and who will manage the website or system after launch.</p><div className={s.inlineLinks}><Link className={s.textLink} href="/pricing">See packages & inclusions</Link><Link className={s.textLink} href="/insights/small-business-website-cost-uk">Understand website costs</Link></div></div><div><ol className={s.planList}>{item.planning.map(text => <li key={text}>{text}</li>)}</ol><div className={s.costNote}><p>{item.cost}</p></div></div></div></section>
      <section className={s.questions} id="questions"><div className={`${s.shell} ${s.questionsGrid}`}><div className={s.questionsHeader}><h2>{item.faqTitle}</h2><p>Practical answers before you decide on the next step.</p></div><div className={s.questionList}>{item.faq.map(([question, answer]) => <details key={question} className={s.question}><summary><h3>{question}</h3><span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
      {["business-websites", "ecommerce-websites"].includes(item.slug) && <WebsiteClientWork showImage={false} />}
      <WebsiteRelated item={item} />
      <WebsiteFinalCta title={`Let's plan your ${item.group === "systems" ? "system" : "website"}.`} quote={quote} description="Share the requirement and your current setup. We can then agree the useful first version, the scope and the next step." />
    </MotionRegion>
  </main>;
}
