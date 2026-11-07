import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { googleChecklist, googleChecklistPath } from '@/lib/google-growth-resources.mjs';
import PrintChecklist from '@/components/PrintChecklist';
import s from '@/components/Guides.module.css';
import './print.css';
export const metadata = pageMetadata(googleChecklistPath, 'Google Visibility Checklist for Service Businesses', 'A free, printable checklist to set up your Google Business Profile, connect online bookings, improve your website and measure local enquiries.');
export default function GoogleChecklistPage() {
  return <main className={s.checklist} data-google-checklist>
    <Link href="/resources">JovaMedia Resources</Link><h1>Your Google visibility checklist.</h1>
    <p>Twelve checks to help local customers find you and book. Work through them at your own pace, then choose one improvement to make next.</p>
    <div className={s.checklistTools}><PrintChecklist/><Link href="/blog/google-business-profile-service-business">Start the first guide</Link></div>
    {googleChecklist.map((group, index) => <section key={group.guide} className={s.checkGroup}><h2>{index + 1}. {group.title}</h2>{group.items.map(item => <label key={item}><input type="checkbox"/><span>{item}</span></label>)}<Link href={`/blog/${group.guide}`}>Read the step-by-step guide</Link></section>)}
    <section className={s.checklistNote}><h2>Your next improvement</h2><p>Write down one task, who will do it and when you will review it. Keep enquiries and bookings separate from clicks. These steps help you build useful foundations; Google decides indexing and rankings.</p><Link href="/">See how JovaBook brings bookings together</Link></section>
  </main>;
}
