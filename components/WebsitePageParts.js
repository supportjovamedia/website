import Link from "next/link";
import { websiteBySlug, websitePath } from "@/lib/website-catalogue.mjs";
import { whatsappLink } from "@/lib/business-contact.mjs";
import { WebsitePhoto } from "./WebsitePhotography";
import WebsiteRail from "./WebsiteRail";
import WebsiteSystemArtwork from "./WebsiteSystemArtwork";
import s from "@/app/websites/websites.module.css";

export function WebsiteTypeCard({ item, showImage = true }) {
  return <Link href={websitePath(item.slug)} className={`${s.typeCard} ${showImage ? "" : s.textCard}`}>
    {showImage && <div className={s.cardPhoto}>{item.group === "systems" ? <WebsiteSystemArtwork type={item.visual} compact /> : <WebsitePhoto name={item.cardPhoto || item.heroPhotos[0]} sizes="(max-width:900px) 82vw, 44vw" />}</div>}
    <div className={s.cardCopy}><h3>{item.name}</h3><p>{item.summary}</p><span className={s.cardAction}>Explore {item.shortName.toLowerCase()}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" /></svg></span></div>
  </Link>;
}

export function WebsiteRelated({ item }) {
  const related = item.related.map(websiteBySlug);
  return <section className={s.related}><div className={s.shell}><header className={s.sectionHeader}><h2>{item.relatedTitle}</h2><p>Choose the approach that fits the job. We can help define the useful first step.</p></header><WebsiteRail key={item.slug} compact items={related.map(x => x.name)} label="Related website options" id={`related-${item.slug}`}>{related.map(other => <WebsiteTypeCard key={other.slug} item={other} showImage={false} />)}</WebsiteRail></div></section>;
}

export function WebsiteClientWork({ showImage = true }) {
  return <section className={s.workBand} id="website-work"><div className={`${s.shell} ${s.workGrid}`} data-text-only={!showImage || undefined}>
    {showImage && <Link href="/work/qaiser-watches" className={s.workPhoto} aria-label="Explore the Qaiser Watches client website"><WebsitePhoto name="qaiser" sizes="(max-width:900px) 90vw, 46vw" /></Link>}
    <div><h2>Qaiser Watches.<br />A website you can explore.</h2><p>A retail website built around a watchmaker&apos;s collection, product details and story. See the actual project, delivered scope and client feedback.</p><Link className={s.textLink} href="/work/qaiser-watches">Explore the client project</Link><small>Delivered scope: retail catalogue, product browsing and the watchmaker’s story. Explore the case study for the full project.</small></div>
  </div></section>;
}

export function WebsiteFinalCta({ id, title = "Let's plan the website your business needs.", quote = "/get-a-quote", description = "Tell us what you do, what you need and what you already have. We can then define a useful starting point.", actionLabel = "Discuss your project" }) {
  return <section id={id} className={s.finalCta}><div className={s.shell}><div><h2>{title}</h2><p>{description}</p></div><div className={s.actions}><Link className={s.primary} href={quote}>{actionLabel}</Link><a className={s.secondary} href={whatsappLink("other")} target="_blank" rel="noopener noreferrer" data-contact-placement="other">Chat on WhatsApp</a></div></div></section>;
}
