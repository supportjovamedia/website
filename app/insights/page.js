import PhotoHero from "@/components/PhotoHero";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { articles, articleReadMinutes } from "@/lib/insights.mjs";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import InsightCover from "@/components/InsightCover";
import ContactChoices from "@/components/ContactChoices";
import s from "@/components/Editorial.module.css";

export const metadata = pageMetadata("/insights", "Website, Booking & Security Guides | JovaMedia", "Practical guides to website security, AI, salon booking systems and small business website costs. Clear explanations, worked examples and linked sources.");
export default function InsightsPage() {
  return <main className={s.editorial}>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "JovaMedia Insights", url: "https://www.jovamedia.com/insights", mainEntity: { "@type": "ItemList", itemListElement: articles.map((article, index) => ({ "@type": "ListItem", position: index + 1, url: `https://www.jovamedia.com/insights/${article.slug}`, name: article.title })) } }}/>
    <PhotoHero src={"/hero-backgrounds/services.webp"} className={`page-hero ${s.photoHero}`}><div className={s.shell}><header className={s.indexHero}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Insights", path: "/insights" }]}/><h1>Websites, bookings<br/>and better decisions.</h1><p className={s.intro}>Practical guides for small business owners. Understand website costs, compare booking options and keep up with the security issues that affect your business.</p></header></div></PhotoHero>
    <div className={s.shell}>
      <section className={s.indexGrid} aria-label="Website, booking and security guides">{articles.map(article => <article className={s.card} key={article.slug}><Link className={s.cardLink} href={`/insights/${article.slug}`}><InsightCover kind={article.cover} compact/><div className={s.cardMeta}><span>{article.category}</span><span>{articleReadMinutes(article)} min read</span></div><h2>{article.title}</h2></Link><p>{article.summary}</p><Link className={s.readLink} href={`/insights/${article.slug}`}>Read article<span className={s.srOnly}>: {article.title}</span></Link></article>)}</section>
      <ContactChoices/>
    </div>
  </main>;
}
