import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { articleReadMinutes } from '@/lib/insights.mjs';
import InsightCover from './InsightCover';
import Breadcrumbs from './Breadcrumbs';
import StructuredData from './StructuredData';
import e from './Editorial.module.css';
import s from './Guides.module.css';
export { pageMetadata };
export function ResourceCards({ items }){return <div className={s.hubGrid}>{items.map(article=><article key={article.slug} className={s.hubCard}><Link href={`/blog/${article.slug}`}><InsightCover kind={article.cover} compact/><div className={s.hubCardBody}><span>{article.step?`Guide ${article.step} of 4`:article.category} · {articleReadMinutes(article)} min read</span><h3>{article.title}</h3><p>{article.summary}</p><b>{article.step?'Read the guide':'Read the article'}</b></div></Link></article>)}</div>}
export default function ResourceCollection({title,description,items,path,label}){return <main className={e.editorial}><StructuredData data={{'@context':'https://schema.org','@type':'CollectionPage',name:title,url:`https://www.jovamedia.com${path}`,hasPart:items.map(a=>({'@type':'Article',headline:a.title,url:`https://www.jovamedia.com/blog/${a.slug}`}))}}/><section className={s.hubHero}><div className={e.shell}><Breadcrumbs items={[{name:'Home',path:'/'},{name:'Resources',path:'/resources'},{name:label,path}]}/><h1>{title}</h1><p>{description}</p><nav className={s.hubLinks} aria-label="Resource types"><Link href="/blog">Blogs</Link><Link href="/resources/tips-and-tricks">Tips &amp; tricks</Link><Link href="/resources/guides">Guides</Link></nav></div></section><div className={e.shell}><section className={s.hubGuides} aria-label={label}><ResourceCards items={items}/></section></div></main>}
