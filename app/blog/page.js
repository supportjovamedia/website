import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { articles, articleReadMinutes } from "@/lib/insights.mjs";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import InsightCover from "@/components/InsightCover";
import ContactChoices from "@/components/ContactChoices";
import s from "@/components/Editorial.module.css";

export const metadata = pageMetadata("/blog", "Small Business, Booking & Website Blogs | JovaMedia", "Articles on booking systems, small business websites and making useful improvements to your online presence.");
const blogArticles = articles.filter(article => !article.series && !['tips','guides'].includes(article.collection));
export default function BlogPage() {
  return <main className={`${s.editorial} ${s.resourcePage}`}>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "JovaMedia Blog", url: "https://www.jovamedia.com/blog", mainEntity: { "@type": "ItemList", itemListElement: blogArticles.map((article, index) => ({ "@type": "ListItem", position: index + 1, url: `https://www.jovamedia.com/blog/${article.slug}`, name: article.title })) } }}/>
    <section className={s.googleSeriesHero}><div className={s.shell}><header className={s.indexHero}><Breadcrumbs visible={false} items={[{ name: "Home", path: "/" }, { name: "Blogs", path: "/blog" }]}/><h1>Ideas for your business.<br/>A closer look at what works.</h1><p className={s.intro}>Booking systems, website decisions and the details worth getting right. For step-by-step help, explore our guides and tips in Resources.</p></header></div></section>
    <div className={s.shell}>
      <section className={s.indexGrid} aria-label="Business growth, booking and website guides">{blogArticles.map(article => <article className={s.card} key={article.slug}><Link prefetch={false} className={s.cardLink} href={`/blog/${article.slug}`}><InsightCover kind={article.cover} compact/><div className={s.cardMeta}><span>{article.series ? `Google guide ${article.step} of 4` : article.category}</span><span>{articleReadMinutes(article)} min read</span></div><h2>{article.title}</h2></Link><p>{article.summary}</p><Link prefetch={false} className={s.readLink} href={`/blog/${article.slug}`}>Read article<span className={s.srOnly}>: {article.title}</span></Link></article>)}</section>
      <ContactChoices/>
    </div>
  </main>;
}
