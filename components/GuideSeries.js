import Link from 'next/link';
import { googleGrowthArticles } from '@/lib/articles/google-growth.mjs';
import s from './Guides.module.css';
export default function GuideSeries({ current }) {
  return <nav className={s.series} aria-label="Get found on Google: four-step guide">
    <div className={s.seriesIntro}><p>Get found on Google</p><span>Four practical steps for your service business.</span></div>
    <ol>{googleGrowthArticles.map(article => <li key={article.slug}><Link href={`/blog/${article.slug}`} aria-current={current === article.slug ? 'page' : undefined}><span className={s.step}>{String(article.step).padStart(2, '0')}</span><span>{['Set up your profile', 'Connect your booking link', 'Improve your website', 'Reviews and results'][article.step - 1]}</span></Link></li>)}</ol>
  </nav>;
}
