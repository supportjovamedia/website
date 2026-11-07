import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { googleGrowthArticles } from '@/lib/articles/google-growth.mjs';
import { articleReadMinutes } from '@/lib/insights.mjs';
import InsightCover from '@/components/InsightCover';
import Breadcrumbs from '@/components/Breadcrumbs';
import StructuredData from '@/components/StructuredData';
import e from '@/components/Editorial.module.css';
import s from '@/components/Guides.module.css';
export const metadata=pageMetadata('/resources','Small Business Guides & Free Resources | JovaMedia','Practical guides, useful articles and a free Google visibility checklist for service businesses. Learn how to get found, take bookings and grow at your own pace.');
export default function ResourcesPage(){return <main className={e.editorial}>
 <StructuredData data={{'@context':'https://schema.org','@type':'CollectionPage',name:'JovaMedia Resources',url:'https://www.jovamedia.com/resources',hasPart:googleGrowthArticles.map(article=>({'@type':'Article',headline:article.title,url:`https://www.jovamedia.com/blog/${article.slug}`}))}}/>
 <section className={s.hubHero}><div className={e.shell}><Breadcrumbs items={[{name:'Home',path:'/'},{name:'Resources',path:'/resources'}]}/><h1>A little know-how.<br/>A clearer next step.</h1><p>Practical resources for your service business. Get found, make booking easier and work out what to improve next.</p><nav className={s.hubLinks} aria-label="Resource types"><a href="#google-guides">Step-by-step guides</a><Link href="/blog">Articles</Link><Link href="/resources/google-visibility-checklist">Free checklist</Link></nav></div></section>
 <div className={e.shell}><section id="google-guides" className={s.hubGuides}><h2>Get found on Google.</h2><p>Four guides to help you do it yourself, from setting up your profile to tracking the bookings that matter.</p><div className={s.hubGrid}>{googleGrowthArticles.map(article=><article key={article.slug} className={s.hubCard}><Link href={`/blog/${article.slug}`}><InsightCover kind={article.cover} compact/><div className={s.hubCardBody}><span>Guide {article.step} of 4 · {articleReadMinutes(article)} min read</span><h3>{article.title}</h3><p>{article.summary}</p><b>Read the guide</b></div></Link></article>)}</div></section>
 <section className={s.hubTools}><div><h2>Keep the next step simple.</h2><p>Use the twelve-point Google visibility checklist while you work through the guides. Tick off each task, or save a copy to use later.</p><Link href="/resources/google-visibility-checklist">Open the free checklist</Link></div><div><h2>Looking for something else?</h2><p>Browse our articles on booking decisions, website planning and keeping your business website secure.</p><Link href="/blog">Browse all articles</Link></div></section></div>
 </main>}
