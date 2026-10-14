import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { articles, articleReadMinutes } from "@/lib/insights.mjs";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import InsightCover from "@/components/InsightCover";
import ContactChoices from "@/components/ContactChoices";
import s from "@/components/Editorial.module.css";

export const metadata = pageMetadata("/insights", "Website, Salon Booking & Small Business Guides | JovaMedia", "Practical UK guides to small business website costs, salon booking fees, lash-business websites and launch checks. Clear answers, worked examples and sources.");
export default function InsightsPage() {
  return <main className={s.editorial}>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "JovaMedia Insights", url: "https://www.jovamedia.com/insights", mainEntity: { "@type": "ItemList", itemListElement: articles.map((article, index) => ({ "@type": "ListItem", position: index + 1, url: `https://www.jovamedia.com/insights/${article.slug}`, name: article.title })) } }}/>
    <div className={s.shell}>
      <header className={s.indexHero}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Insights", path: "/insights" }]}/><h1>Websites, bookings<br/>and better decisions.</h1><p className={s.intro}>Practical guides for small business owners. Understand website costs, compare booking options and work out what your customers need.</p></header>
      <section className={s.indexGrid} aria-label="Website and booking guides">{articles.map(article => <article className={s.card} key={article.slug}><Link className={s.cardLink} href={`/insights/${article.slug}`}><InsightCover kind={article.cover} compact/><div className={s.cardMeta}><span>{article.category}</span><span>{articleReadMinutes(article)} min read</span></div><h2>{article.title}</h2></Link><p>{article.summary}</p><Link className={s.readLink} href={`/insights/${article.slug}`}>Read article<span className={s.srOnly}>: {article.title}</span></Link></article>)}</section>
      <ContactChoices/>
    </div>
  </main>;
}
