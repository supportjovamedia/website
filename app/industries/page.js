import Link from 'next/link';
import {bookingIndustries} from '@/lib/jovabook-industries.mjs';
import {pageMetadata} from '@/lib/seo';
import s from './industries.module.css';

export const metadata=pageMetadata('/industries','Booking software by industry | JovaBook by JovaMedia','Find an online booking system for your service business: salons, barbers, photographers, tutors and private instructors. Explore appointment workflows and free plans.');
export default function IndustriesPage(){return <main className={s.page}>
 <section className={s.hero}><div className={s.wrap}><p className={s.brand}>JovaBook</p><h1>A booking system<br/>for the way you work.</h1><p>From the first lesson to the next client appointment. Find the booking workflow that fits your business.</p><div className={s.actions}><a className={s.primary} href='https://book.jovamedia.com/?portal=owner&plan=essential&cadence=monthly#signup'>Start for free</a><Link prefetch={false} className={s.secondary} href='/online-booking'>How online booking works</Link></div></div></section>
 <div className={s.wrap}>{['Hair & beauty','Wellness','Teaching & fitness','Professional services'].map(group=><section className={s.directoryGroup} key={group} aria-label={group}><h2>{group}</h2><div className={s.grid}>{bookingIndustries.filter(item=>item.group===group).map(item=><Link prefetch={false} className={s.card} href={'/industries/'+item.slug} key={item.slug}><h3>{item.name}</h3><p>{item.intro}</p><span>View booking guide</span></Link>)}</div></section>)}<div className={s.note}><h2>Your business, your booking page.</h2><p>Every plan includes a one-page website and 0% booking commission. Start Free, then choose Solo or Team when you need more.</p><Link prefetch={false} href='/pricing'>Compare plans</Link></div></div>
 </main>;}
