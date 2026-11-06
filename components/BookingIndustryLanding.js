// Precompressed, versioned WebP files avoid runtime image transformations.
import Link from 'next/link';
import media from '@/lib/jovabook-industry-media.json';
import {bookingIndustries} from '@/lib/jovabook-industries.mjs';
import s from '@/app/industries/industries.module.css';

const signup='https://book.jovamedia.com/?portal=owner&plan=essential&cadence=monthly#signup';
function Picture({name,hero=false}){
 const image=media[name];
 return <picture><source media='(max-width:600px)' srcSet={image.small.src}/><img src={image.large.src} width={image.large.width} height={image.large.height} alt={image.alt} loading={hero?'eager':'lazy'} fetchPriority={hero?'high':'auto'} decoding='async'/></picture>;
}
export default function BookingIndustryLanding({item,path}){
 const faqs=item.faqs||[[item.question,item.answer]];
 const related=item.related.map(slug=>bookingIndustries.find(other=>other.slug===slug)).filter(Boolean);
 const schema={
  '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
   {'@type':'ListItem',position:1,name:'JovaBook',item:'https://www.jovamedia.com'},
   {'@type':'ListItem',position:2,name:'Booking by industry',item:'https://www.jovamedia.com/industries'},
   {'@type':'ListItem',position:3,name:item.name,item:`https://www.jovamedia.com${path}`},
  ],
 };
 if(path==='/online-booking')schema.itemListElement=[schema.itemListElement[0],{...schema.itemListElement[2],position:2}];
 return <main className={s.page}>
  <section className={s.hero} aria-labelledby='industry-title'><div className={s.wrap}>
   <nav aria-label='Breadcrumb' className={s.breadcrumb}><Link prefetch={false} href='/'>JovaBook</Link><span aria-hidden='true'>/</span>{path!=='/online-booking'&&<><Link prefetch={false} href='/industries'>Booking by industry</Link><span aria-hidden='true'>/</span></>}<span aria-current='page'>{item.name}</span></nav>
   <div className={s.heroLayout}><div><p className={s.eyebrow}>{item.name}</p><h1 id='industry-title'>{item.title}.</h1><p>{item.intro}</p><div className={s.actions}><a className={s.primary} href={signup}>Start for free</a><Link prefetch={false} className={s.secondary} href='/pricing'>See plans</Link></div><p className={s.smallPrint}>No card on Free. 0% booking commission.</p></div><figure className={`${s.heroVisual} ${item.photo==='calendar'||item.photo==='services'?s.productVisual:''}`}><Picture name={item.photo} hero/><figcaption>{item.photo==='calendar'||item.photo==='services'?'JovaBook workspace. Example business data.':'Your business, your services, your booking day.'}</figcaption></figure></div>
  </div></section>
  <section className={`${s.wrap} ${s.story}`} aria-labelledby='workflow-title'><div><p className={s.eyebrow}>Built around your appointments</p><h2 id='workflow-title'>{item.storyTitle}</h2></div><div>{item.story.map(copy=><p key={copy}>{copy}</p>)}</div></section>
  <section className={`${s.wrap} ${s.setup}`} aria-labelledby='setup-title'><div className={s.sectionHeading}><h2 id='setup-title'>Set up your booking day.</h2></div><ol className={s.workflow}>{item.workflow.map((step,i)=><li key={step}><span aria-hidden='true'>0{i+1}</span><p>{step}</p></li>)}</ol>
   {item.examples&&<div className={s.examples}><p>Example service menu</p><ul>{item.examples.map(example=><li key={example}>{example}</li>)}</ul><span>Set your own services, prices and durations.</span></div>}
  </section>
  <section className={`${s.wrap} ${s.feature}`} aria-labelledby='features-title'><figure className={s.productVisual}><Picture name={item.photo==='calendar'?'services':'calendar'}/><figcaption>JovaBook product preview with example data.</figcaption></figure><div><p className={s.eyebrow}>In your workspace</p><h2 id='features-title'>The details behind a simpler booking.</h2><div className={s.benefits}>{item.benefits.map(([title,copy])=><article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
  <section className={`${s.wrap} ${s.faqs}`} aria-labelledby='questions-title'><h2 id='questions-title'>Before you get started.</h2>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
  <section className={s.wrap}><div className={s.closing}><div><p className={s.eyebrow}>Start with your next booking</p><h2>Your business. Your booking link.</h2><p>Free includes one calendar, 20 bookings and 50 emails each month, plus a one-page website. Solo is £20/month. Team starts at £25/month, with extra staff seats charged separately.</p><p className={s.smallPrint}>Open to businesses in the UK, US, Canada and Australia. Prices shown in GBP. Stripe processing fees are separate.</p></div><div className={s.closingActions}><a className={s.primary} href={signup}>Create your free account</a><Link prefetch={false} href='/pricing'>Compare plans and allowances</Link></div></div></section>
  <nav className={`${s.wrap} ${s.related}`} aria-label='Related booking guides'><h2>Explore another booking workflow.</h2><div>{related.map(other=><Link key={other.slug} prefetch={false} href={`/industries/${other.slug}`}>{other.name}<span aria-hidden='true'>↗</span></Link>)}<Link prefetch={false} href={path==='/online-booking'?'/industries':'/online-booking'}>{path==='/online-booking'?'All industries':'How online booking works'}<span aria-hidden='true'>↗</span></Link></div></nav>
  <script type='application/ld+json' dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/>
 </main>;
}
