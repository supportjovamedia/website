/* eslint-disable @next/next/no-img-element -- Reuse precompressed, sized WebP assets without runtime CDN transformations. */
import Link from 'next/link';
import {bookingIndustries} from '@/lib/jovabook-industries.mjs';
import media from '@/lib/jovabook-industry-media.json';
import {pageMetadata} from '@/lib/seo';
import s from './directory.module.css';
const title='Online Booking Systems by Industry | JovaBook';
const description='Find an online booking system for salons, photographers, tutors and other appointment businesses. Explore your workflow, with a website included and a free plan.';
const base=pageMetadata('/industries',title,description);
const share={url:'/share/jovabook-industries-2026-11-09.png',width:1200,height:630,alt:'JovaBook online booking systems for salons, wellness, tutors and photographers'};
export const metadata={...base,title:{absolute:title},openGraph:{...base.openGraph,title,images:[share]},twitter:{...base.twitter,title,images:[share]}};
const groups=[
 {id:'hair-and-beauty',name:'Hair & beauty',intro:'From the next haircut to a full set. Find the appointment menu for your services.',image:media.salon.small.src,alt:'Styling chairs and mirrors in a salon'},
 {id:'wellness',name:'Wellness',intro:'Keep scheduled sessions clear, with the right boundaries for your practice.',image:media.spa.small.src,alt:'A treatment space prepared for a wellness appointment'},
 {id:'teaching-and-fitness',name:'Teaching & fitness',intro:'Give clients a time for an individual lesson, training session or private class.',image:media.tutor.small.src,alt:'A tutor working with a student'},
 {id:'professional-services',name:'Professional services',intro:'Make fixed sessions and initial consultations easier to arrange.',image:'/jovabook/industries/photography-directory-2026-11-09.webp',alt:'A camera used for photography sessions'},
];
const descriptions={
 'hair-salons':'Cuts, colour consultations and separate stylist diaries.',barbers:'Haircuts, beard trims and appointments alongside walk-ins.',
 'nail-salons':'New sets, infills and removals with clear appointment lengths.',spas:'Treatment choices, therapist schedules and booking links.',
 'medical-spas':'Administrative consultation times and practitioner availability.','tanning-salons':'Fixed spray tan appointments and a clear service menu.',
 'pilates-instructors':'One-to-one Pilates sessions around your teaching hours.','mental-health-practitioners':'Review general appointment administration for your practice.',
 'lash-and-brow-artists':'Full sets, infills and brow treatments clients can tell apart.','massage-therapists':'Different session lengths in one appointment diary.',
 'yoga-instructors':'Private yoga lessons with clear times and prices.','tattoo-artists':'Consultations and studio appointments agreed with clients.',
 'salons-and-barbers':'Compare salon and barbershop appointment workflows.','beauty-and-nails':'A mixed beauty treatment menu with one booking route.',
 tutors:'Individual lessons that parents or students can book.','personal-trainers':'One-to-one training sessions and consultations.',
 clinics:'Check appointment administration against your practice’s needs.',photographers:'Headshots, portraits and fixed photo sessions.',
};
export default function IndustriesPage(){return <main className={s.page}>
 <section className={s.hero} aria-labelledby='industries-title'><div className={`${s.shell} ${s.heroGrid}`}>
  <div className={s.heroCopy}><p className={s.label}>JovaBook · Find your industry</p><h1 id='industries-title'>Online booking.<br/>Your kind of business.</h1><p className={s.intro}>A salon diary, a private lesson, the next photo shoot. Find a booking setup that fits the appointments you offer.</p><a href='#browse-industries' className={s.button}>Find your industry</a><p className={s.offer}>A website included. Free to start.</p></div>
  <div className={s.bookingVisual}><div className={s.visualHeading}><span>Your next appointment</span><span className={s.visualDot} aria-hidden='true'/></div><img src={media.booking.small.src} width={media.booking.small.width} height={media.booking.small.height} alt={media.booking.alt} fetchPriority='high' decoding='async'/><div className={s.visualFooter}>Your services. Your available times.</div></div>
 </div></section>
 <section className={`${s.shell} ${s.browse}`} id='browse-industries' aria-labelledby='browse-title'><div className={s.sectionHeading}><h2 id='browse-title'>Find your fit.</h2><p>Explore {bookingIndustries.length} appointment workflows.</p></div><nav className={s.categories} aria-label='Browse industries by category'>{groups.map(group=><a className={s.category} href={`#${group.id}`} key={group.id}><div className={s.categoryImage}><img src={group.image} alt={group.alt} width='640' height='427' loading='lazy' decoding='async'/></div><div><span>{group.name}</span><small>{bookingIndustries.filter(item=>item.group===group.name).length} {bookingIndustries.filter(item=>item.group===group.name).length===1?'industry':'industries'}</small></div></a>)}</nav></section>
 <div className={s.directory}>{groups.map(group=><section id={group.id} className={s.group} key={group.id} aria-labelledby={`${group.id}-title`}><div className={`${s.shell} ${s.groupGrid}`}><div className={s.groupHeading}><h2 id={`${group.id}-title`}>{group.name}</h2><p>{group.intro}</p></div><div className={s.industryGrid}>{bookingIndustries.filter(item=>item.group===group.name).map(item=><Link prefetch={false} className={s.industry} href={'/industries/'+item.slug} key={item.slug}><h3>{item.name}</h3><p>{descriptions[item.slug]}</p><span>Explore booking options</span></Link>)}</div></div></section>)}</div>
 <section className={`${s.shell} ${s.nextStep}`} aria-labelledby='your-booking-page'><div><p className={s.label}>Start with your own calendar</p><h2 id='your-booking-page'>Your business.<br/>Your booking page.</h2><p>A calendar, client records and a one-page website. Free includes 20 bookings each month, with 0% booking commission.</p></div><div className={s.nextActions}><a className={s.button} href='https://book.jovamedia.com/?portal=owner&plan=essential&cadence=monthly#signup'>Start for free</a><Link prefetch={false} href='/pricing'>Compare plans</Link></div></section>
 </main>;}
