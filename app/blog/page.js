import PhotoHero from "@/components/PhotoHero";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { articles, articleReadMinutes } from "@/lib/insights.mjs";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import InsightCover from "@/components/InsightCover";
import ContactChoices from "@/components/ContactChoices";
import GuideSeries from "@/components/GuideSeries";
import s from "@/components/Editorial.module.css";

export const metadata = pageMetadata("/blog", "Small Business Growth, Google & Booking Guides | JovaMedia", "Practical guides to getting found on Google, turning visits into bookings and running your service business. Clear steps, checklists and useful examples.");
export default function BlogPage() {
  return <main className={s.editorial}>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "JovaMedia Guides", url: "https://www.jovamedia.com/blog", mainEntity: { "@type": "ItemList", itemListElement: articles.map((article, index) => ({ "@type": "ListItem", position: index + 1, url: `https://www.jovamedia.com/blog/${article.slug}`, name: article.title })) } }}/>
    <PhotoHero src={"/hero-backgrounds/services.webp"} className={`page-hero ${s.photoHero}`}><div className={s.shell}><header className={s.indexHero}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/blog" }]}/><h1>Guides to growing<br/>your service business.</h1><p className={s.intro}>Get found on Google, make booking easier and learn what to improve next. Practical steps you can work through yourself.</p></header></div></PhotoHero>
    <div className={s.shell}>
      <GuideSeries/>
      <section className={s.indexGrid} aria-label="Business growth, booking and website guides">{articles.map(article => <article className={s.card} key={article.slug}><Link className={s.cardLink} href={`/blog/${article.slug}`}><InsightCover kind={article.cover} compact/><div className={s.cardMeta}><span>{article.series ? `Google guide ${article.step} of 4` : article.category}</span><span>{articleReadMinutes(article)} min read</span></div><h2>{article.title}</h2></Link><p>{article.summary}</p><Link className={s.readLink} href={`/blog/${article.slug}`}>Read guide<span className={s.srOnly}>: {article.title}</span></Link></article>)}</section>
      <ContactChoices/>
    </div>
  </main>;
}
