import Link from 'next/link';
import Image from 'next/image';
import { pageMetadata } from '@/lib/seo';
import { googleGrowthArticles } from '@/lib/articles/google-growth.mjs';
import { bookingSetupArticles } from '@/lib/articles/booking-setup.mjs';
import { bookingTips } from '@/lib/articles/booking-tips.mjs';
import { bookingGrowthArticles, bookingComparisonArticle } from '@/lib/articles/booking-growth.mjs';
import { ResourceCards } from '@/components/ResourceCollection';
import Breadcrumbs from '@/components/Breadcrumbs';
import StructuredData from '@/components/StructuredData';
import e from '@/components/Editorial.module.css';
import s from '@/components/Guides.module.css';
export const metadata=pageMetadata('/resources','Small Business Guides & Free Resources | JovaMedia','Practical guides, useful articles and a free Google visibility checklist for service businesses. Learn how to get found, take bookings and grow at your own pace.');
export default function ResourcesPage(){return <main className={e.editorial}>
 <StructuredData data={{'@context':'https://schema.org','@type':'CollectionPage',name:'JovaMedia Resources',url:'https://www.jovamedia.com/resources',hasPart:[...bookingSetupArticles,...bookingGrowthArticles,bookingComparisonArticle,...googleGrowthArticles,...bookingTips].map(article=>({'@type':'Article',headline:article.title,url:`https://www.jovamedia.com/blog/${article.slug}`}))}}/>
 <section className={`${s.hubHero} ${s.photoHubHero}`}><div className={`${e.shell} ${s.heroColumns}`}><div><Breadcrumbs items={[{name:'Home',path:'/'},{name:'Resources',path:'/resources'}]}/><h1>Guides, tips and tools<br/>for your service business.</h1><p>Find your next customer, make booking easier and spend less time chasing the details. Here’s some help you can use yourself.</p><nav className={s.hubLinks} aria-label="Resource types"><Link prefetch={false} href="/blog">Blogs</Link><Link prefetch={false} href="/resources/tips-and-tricks">Tips &amp; tricks</Link><Link prefetch={false} href="/resources/guides">Guides</Link></nav></div><div className={s.heroPhotograph}><Image src="/jovabook/story/why-free-calendar-5689438.webp" alt="An appointment calendar open on a phone beside a laptop" fill unoptimized priority sizes="(max-width:700px) 90vw, 560px"/></div></div></section>
 <div className={e.shell}><section className={s.hubGuides} aria-labelledby="booking-guides"><div className={s.sectionIntro}><div><h2 id="booking-guides">Make the next booking easier.</h2><p>A clearer treatment menu, a better cost comparison or a plan for moving your diary. Use the worksheets and guides to get started.</p></div><Link prefetch={false} href="/resources/guides">All guides</Link></div><ResourceCards items={[...bookingSetupArticles,...bookingGrowthArticles,bookingComparisonArticle]}/></section>
 <section id="google-guides" className={s.hubGuides}><div className={s.sectionIntro}><div><h2>Get found on Google.</h2><p>Set up your profile, connect your booking link and make your website more useful. Four guides, one step at a time.</p></div><Link prefetch={false} href="/resources/guides">All guides</Link></div><ResourceCards items={googleGrowthArticles}/></section>
 <section className={`${s.hubGuides} ${s.tipsSection}`}><div className={s.sectionIntro}><div><h2>Tips for the everyday stuff.</h2><p>A free slot tomorrow. A reminder to write. A booking link nobody can find. Start with the problem you have today.</p></div><Link prefetch={false} href="/resources/tips-and-tricks">All tips &amp; tricks</Link></div><ResourceCards items={bookingTips}/></section>
 <section className={s.hubTools}><div><h2>Your next twelve checks.</h2><p>Keep the Google visibility checklist beside you while you follow the guides. Tick things off, save a copy and come back to the rest.</p><Link prefetch={false} href="/resources/google-visibility-checklist">Open the free checklist</Link></div><div><h2>From the blog.</h2><p>Longer reads on choosing booking tools, planning a website and looking after it once it’s live.</p><Link prefetch={false} href="/blog">Browse the blogs</Link></div></section></div>
 </main>}
