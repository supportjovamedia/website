import PhotoHero from "@/components/PhotoHero";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { articles, articleBySlug, articleReadMinutes, articleSchema, articleDates } from "@/lib/insights.mjs";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import ArticleBody from "@/components/ArticleBody";
import InsightCover from "@/components/InsightCover";
import ContactChoices from "@/components/ContactChoices";
import GuideSeries from "@/components/GuideSeries";
import LinkCta from "@/components/GuideSignupCta";
import s from "@/components/Editorial.module.css";

const articleHeroImages = { phpSecurity: "/websites/photography/crm-systems-hero-context.webp", aiSecurity: "/websites/photography/bespoke-websites-hero-main.webp", bookingSecurity: "/websites/photography/booking-systems-editorial-one.webp", booking: "/service-editorial/email.jpg", cost: "/hero-backgrounds/pricing.webp", lashes: "/insights/lash-treatment.webp", salon: "/insights/salon-interior.webp", salonInvestment: "/insights/salon-interior.webp", business: "/insights/qaiser-website.webp", launch: "/service-editorial/copywriting.jpg" };

export const dynamicParams = false;
export function generateStaticParams() { return articles.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return {};
  const metadata = pageMetadata(`/blog/${slug}`, article.seoTitle, article.description);
  const { publishedAt, updatedAt } = articleDates(article);
  return { ...metadata, openGraph: { ...metadata.openGraph, type: "article", publishedTime: publishedAt, modifiedTime: updatedAt, authors: ["https://www.jovamedia.com/about"], images: [{ url: `https://www.jovamedia.com/blog/${slug}/opengraph-image`, width: 1200, height: 630, alt: article.title }] }, twitter: { card: "summary_large_image", images: [{ url: `https://www.jovamedia.com/blog/${slug}/opengraph-image`, alt: article.title }] } };
}
export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) notFound();
  const related = article.related.map(articleBySlug);
  const { publishedAt } = articleDates(article);
  const publicationDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${publishedAt}T00:00:00Z`));
  const headings = article.blocks.filter(block => block.type === "heading" && (!article.contents || article.contents.includes(block.id)));
  const isGuide = article.series === 'google-growth';
  const isResource = isGuide || article.collection==='tips';
  const HeaderFrame = isResource ? 'section' : PhotoHero;
  return <main className={`${s.editorial} ${article.layout === "longform" ? s.articleReading : ""}`}>
    <StructuredData data={articleSchema(article, `https://www.jovamedia.com/blog/${slug}/opengraph-image`)}/>
    <HeaderFrame {...(isResource ? {} : {src:articleHeroImages[article.cover]})} className={isResource ? s.googleSeriesHero : `page-hero ${s.photoHero}`}><div className={s.shell}><header className={s.articleHeader}><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }, { name: article.category, path: `/blog/${slug}` }]}/><h1>{article.title}</h1><p className={s.articleDeck}>{article.summary}</p><div className={s.byline}><Link href="/about">By JovaMedia</Link><time dateTime={publishedAt}>Published {publicationDate}</time><span>{articleReadMinutes(article)} min read</span></div></header></div></HeaderFrame>
    <div className={s.shell}>
      <div className={isResource?s.resourceFeature:s.feature}><InsightCover kind={article.cover}/></div>
      {isGuide && <GuideSeries current={article.slug}/>}
      <div className={`${s.articleLayout} ${article.layout === "longform" ? s.longform : ""}`}>
        <nav className={s.toc} aria-label="In this guide"><p className={s.tocTitle}>Contents</p><ul>{headings.map(block => <li key={block.id}><a href={`#${block.id}`}>{block.title}</a></li>)}</ul><Link href={article.collection === "tips" ? "/resources/tips-and-tricks" : "/resources/guides"}>{article.collection === "tips" ? "All tips & tricks" : "All guides"}</Link></nav>
        <article className={s.articleMain} aria-label={article.title}>
          <ArticleBody blocks={article.blocks} tableHints={article.layout === "longform"}/>
          {isResource && <LinkCta/>}
          <footer className={s.articleFooter}><p>{isGuide ? 'Written by JovaMedia, the team behind JovaBook. Google guidance checked on 7 November 2026.' : isResource ? 'Written by JovaMedia, the team behind JovaBook.' : 'Written by JovaMedia, a London website design and development studio.'}{article.cover === "booking" && " Provider terms checked on 14 October 2026. Check your agreement for the charges that apply to your business."}</p><p><Link href="/about">About JovaMedia</Link> · <Link href="/contact">Ask about this guide</Link></p></footer>
          {!isResource && <ContactChoices compact/>}
        </article>
      </div>
    </div>
    <section className={s.related} aria-labelledby="related-guides"><div className={s.shell}><h2 id="related-guides">Keep learning</h2><div className={s.indexGrid}>{related.map(item => <article className={s.card} key={item.slug}><Link className={s.cardLink} href={`/blog/${item.slug}`}><InsightCover kind={item.cover} compact/><div className={s.cardMeta}><span>{item.category}</span><span>{articleReadMinutes(item)} min read</span></div><h3>{item.title}</h3></Link><p>{item.summary}</p><Link className={s.readLink} href={`/blog/${item.slug}`}>Read guide<span className={s.srOnly}>: {item.title}</span></Link></article>)}</div></div></section>
  </main>;
}
