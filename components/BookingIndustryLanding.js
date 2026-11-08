// Precompressed, versioned WebP files avoid runtime image transformations.
import Link from 'next/link';
import media from '@/lib/jovabook-industry-media.json';
import {bookingIndustries} from '@/lib/jovabook-industries.mjs';
import s from '@/app/industries/industries.module.css';

const signup='https://book.jovamedia.com/?portal=owner&plan=essential&cadence=monthly#signup';
function PageImage({name='dashboard',hero=false}){
 const image=media[name];
 return <picture><source media='(max-width:600px)' srcSet={image.small.src}/><img src={image.large.src} width={image.large.width} height={image.large.height} alt={image.alt} loading={hero?'eager':'lazy'} fetchPriority={hero?'high':'auto'} decoding='async'/></picture>;
}
export default function BookingIndustryLanding({item,path}){
 const faqs=[...(item.faqs||[[item.question,item.answer]]),...(item.extraFaqs||[])];
 const related=item.related.map(slug=>bookingIndustries.find(other=>other.slug===slug)).filter(Boolean);
 const schema={
  '@context':'https://schema.org','@type':'BreadcrumbList','@id':`https://www.jovamedia.com${path}#breadcrumb`,itemListElement:[
   {'@type':'ListItem',position:1,name:'JovaBook',item:'https://www.jovamedia.com'},
   {'@type':'ListItem',position:2,name:'Booking by industry',item:'https://www.jovamedia.com/industries'},
   {'@type':'ListItem',position:3,name:item.name,item:`https://www.jovamedia.com${path}`},
  ],
 };
 if(path==='/online-booking')schema.itemListElement=[schema.itemListElement[0],{...schema.itemListElement[2],position:2}];
 const pageSchema={'@type':'WebPage','@id':`https://www.jovamedia.com${path}#webpage`,url:`https://www.jovamedia.com${path}`,name:item.title,description:item.heroIntro||item.intro,inLanguage:'en-GB',isPartOf:{'@id':'https://www.jovamedia.com/#website'},publisher:{'@id':'https://www.jovamedia.com/#organisation'},about:{'@id':'https://www.jovamedia.com/#software'},breadcrumb:{'@id':schema['@id']},primaryImageOfPage:{'@type':'ImageObject',url:'https://www.jovamedia.com'+media.dashboard.large.src,width:media.dashboard.large.width,height:media.dashboard.large.height}};
 return <main className={s.page}>
  <section className={s.hero} aria-labelledby='industry-title'><div className={s.wrap}>
   <h1 id='industry-title'><span>Online booking software</span>{' '}<span>{item.title.slice('Online booking software'.length).trim()}</span></h1><p className={s.heroIntro}>{item.heroIntro||item.intro}</p><div className={s.actions}><a className={s.primary} href={signup}>Start for free</a><Link prefetch={false} className={s.secondary} href='/pricing'>See plans</Link></div><p className={s.smallPrint}>No card on Free. 0% booking commission.</p><div className={s.dashboard}><PageImage hero/></div>
  </div></section>
  <section className={`${s.wrap} ${s.story}`} aria-labelledby='workflow-title'><div><h2 id='workflow-title'>{item.storyTitle}</h2></div><div>{[item.searchOverview,...item.story.slice(1)].map(copy=><p key={copy}>{copy}</p>)}</div></section>
  <div className={s.editorial}>{item.sections.map(({heading,paragraphs},index)=>{
   const imageName=[item.contextImage,'calendar','services'][index];
   return <section key={heading} className={s.contentSection}><div className={`${s.wrap} ${s.contentRow} ${imageName?s.mediaRow:''} ${index===1?s.reverseRow:''}`}>
    {imageName?<><div className={s.sectionCopy}><h2>{heading}</h2>{paragraphs.map(copy=><p key={copy}>{copy}</p>)}</div><div className={`${s.sectionMedia} ${media[imageName].kind==='photo'?s.photoMedia:s.productMedia}`}><PageImage name={imageName}/></div></>:<><h2>{heading}</h2><div>{paragraphs.map(copy=><p key={copy}>{copy}</p>)}</div></>}
   </div></section>;
  })}</div>
  <section className={`${s.wrap} ${s.features}`} aria-labelledby='features-title'><h2 id='features-title'>Manage your appointments with JovaBook</h2><div className={s.benefits}>{item.benefits.map(([title,copy])=><article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
  <section className={`${s.wrap} ${s.faqs}`} aria-labelledby='questions-title'><h2 id='questions-title'>Questions about your online booking system</h2>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
  {item.setupGuides?.length>0 && <nav className={`${s.wrap} ${s.related}`} aria-label='Plan your booking setup'><h2>Plan your booking setup</h2><div>{item.setupGuides.map(([slug,label])=><Link key={slug} prefetch={false} href={`/blog/${slug}`}>{label}</Link>)}</div></nav>}
  <section className={s.wrap}><div className={s.closing}><div><h2>Start with a free booking calendar</h2><p>{item.closingIntro}</p><p>Free includes one calendar, 20 bookings and 50 emails each month, plus a one-page website. Solo is £20/month. Team starts at £25/month, with extra staff seats charged separately.</p><p className={s.smallPrint}>Open to businesses in the UK, US, Canada and Australia. Prices shown in GBP. Stripe processing fees are separate.</p></div><div className={s.closingActions}><a className={s.primary} href={signup}>Create your free account</a><Link prefetch={false} href='/pricing'>Compare plans and allowances</Link></div></div></section>
  <nav className={`${s.wrap} ${s.related}`} aria-label='Related booking guides'><h2>Booking software for related businesses</h2><div>{related.map(other=><Link key={other.slug} prefetch={false} href={`/industries/${other.slug}`}>{other.name}</Link>)}<Link prefetch={false} href={path==='/online-booking'?'/industries':'/online-booking'}>{path==='/online-booking'?'All industries':'How online booking works'}</Link></div></nav>
  <script type='application/ld+json' dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@graph':[pageSchema,schema]}).replace(/</g,'\\u003c')}}/>
 </main>;
}
