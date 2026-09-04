import Link from 'next/link';
import {services,principles} from '@/lib/data';

function Icon({type}){
  const common={width:30,height:30,viewBox:'0 0 32 32',fill:'none','aria-hidden':'true'};
  if(type==='idea') return <svg {...common}><path d="M12.2 24h7.6M13.5 28h5M16 3.5a8.5 8.5 0 0 0-5.3 15.1c1.5 1.2 2.3 2.4 2.5 3.9h5.6c.2-1.5 1-2.7 2.5-3.9A8.5 8.5 0 0 0 16 3.5Z" stroke="currentColor" strokeWidth="1.5"/><path d="M16 0v2M4.7 4.7l1.4 1.4M0 16h2M30 16h2M25.9 6.1l1.4-1.4" stroke="currentColor" strokeWidth="1.5"/></svg>;
  if(type==='people') return <svg {...common}><circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="1.5"/><circle cx="22" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.5"/><path d="M4 25c.7-5 3.2-7.5 8-7.5s7.3 2.5 8 7.5H4Zm15-5.8c4.4-.1 7 1.9 7.8 5.8H23" stroke="currentColor" strokeWidth="1.5"/></svg>;
  if(type==='chart') return <svg {...common}><path d="M4 27h24M7 23h4V13H7v10Zm7 0h4V7h-4v16Zm7 0h4V3h-4v20Z" stroke="currentColor" strokeWidth="1.5"/></svg>;
  if(type==='screen') return <svg {...common}><rect x="3.5" y="5" width="25" height="17" rx="0" stroke="currentColor" strokeWidth="1.5"/><path d="M12 27h8M16 22v5" stroke="currentColor" strokeWidth="1.5"/></svg>;
  if(type==='visibility') return <svg {...common}><path d="M4 26h24M7 22V14h4v8M14 22V9h4v13M21 22V4h4v18" stroke="currentColor" strokeWidth="1.5"/></svg>;
  if(type==='customers') return <svg {...common}><circle cx="12" cy="11" r="4" stroke="currentColor" strokeWidth="1.5"/><circle cx="22" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 26c.6-5 3.2-7.5 8-7.5 4.9 0 7.4 2.5 8 7.5H4Zm16-6.5c3.8 0 6.2 2.2 7 6.5h-4" stroke="currentColor" strokeWidth="1.5"/></svg>;
  return <svg {...common}><path d="M3 25 11 17l5 5L29 8M22 8h7v7" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

const heroCapabilities = [
  ['01','idea','Strategy & Growth','Research, positioning and digital strategy that drives real business outcomes.'],
  ['02','people','Social & Content','Content creation, social media management and community growth.'],
  ['03','chart','Performance','Paid media, SEO and lead generation with measurable results.'],
  ['04','screen','Digital Experiences','Websites, automation and digital infrastructure built to scale.'],
];

const outcomes=[
  ['visibility','More visibility'],
  ['customers','More customers'],
  ['growth','Real business growth'],
];

export default function Home(){return <main>
<section className="hero hero-v19">
  <div className="hero-orbit" aria-hidden="true"></div>
  <div className="shell hero-v19-grid">
    <div className="hero-copy">
      <div className="kicker">Digital media agency · London</div>
      <h1>
        <span className="hero-line">Brands don’t</span>
        <span className="hero-line">grow by chance.</span>
        <span className="hero-line hero-accent">We make it happen.</span>
      </h1>
      <p className="lead">Strategy, content, social, search, web and technology brought together to help ambitious businesses attract attention, generate demand and grow.</p>
      <div className="actions"><Link className="btn" href="/contact">Start a project <span aria-hidden="true">→</span></Link><Link className="text-link" href="/services">Explore our services <span aria-hidden="true">→</span></Link></div>
      <div className="hero-outcomes" aria-label="Business outcomes">
        {outcomes.map(([icon,label])=><div className="hero-outcome" key={label}><Icon type={icon}/><span>{label}</span></div>)}
      </div>
    </div>
    <aside className="hero-side">
      <div className="hero-side-line"></div>
      <p className="hero-side-title">Ideas into impact.</p>
      <p>We build joined-up digital systems that turn attention into measurable growth.</p>
      <div className="hero-side-disciplines">Strategy<br/>Creative<br/>Media<br/>Technology</div>
    </aside>
  </div>
  <div className="hero-capabilities">
    <div className="shell hero-cap-grid">
      {heroCapabilities.map(([num,icon,name,summary])=><Link href="/services" key={name} className="hero-cap">
        <div className="hero-cap-top"><span className="hero-cap-num">{num}</span><Icon type={icon}/></div>
        <h3>{name}</h3><p>{summary}</p><span className="hero-cap-link">Learn more <b aria-hidden="true">→</b></span>
      </Link>)}
    </div>
  </div>
</section>
<section className="band band-navy"><div className="shell band-grid"><div className="kicker">What we solve</div><h2>Your channels should work together, not compete for attention.</h2><p>We connect brand, content, social, paid media, search and web around one plan. Fewer disconnected activities. Clearer priorities. Better decisions.</p></div></section>
<section className="section"><div className="shell"><div className="section-head"><div><div className="kicker">Capabilities</div><h2>Specialists where you need them. One team around the outcome.</h2></div><p>Use JovaMedia for a focused brief or bring several disciplines together around a larger growth objective.</p></div><div className="feature-service-grid">{services.slice(0,6).map((s,i)=><Link href={'/services/'+s.slug} className={`feature-service tone-${(i%3)+1}`} key={s.slug}><small>{s.eyebrow}</small><h3>{s.name}</h3><p>{s.summary}</p><b>View service →</b></Link>)}</div><div className="center-action"><Link href="/services" className="btn outline">View all capabilities</Link></div></div></section>
<section className="band band-gold"><div className="shell statement"><div className="kicker">A clearer agency relationship</div><h2>Know what is being done, what it is meant to change and what happens next.</h2><Link href="/about" className="text-link">How JovaMedia works →</Link></div></section>
<section className="section"><div className="shell"><div className="section-head"><div><div className="kicker">Why JovaMedia</div><h2>Senior thinking stays close to delivery.</h2></div><p>No inflated team for the sake of it. We shape the work around the problem and keep communication direct.</p></div><div className="principles">{principles.map(([a,b])=><div key={a}><h3>{a}</h3><p>{b}</p></div>)}</div></div></section>
<section className="band band-soft"><div className="shell split promo-split"><div><div className="kicker">Connected digital</div><h2>Attention is only useful when the rest of the journey holds up.</h2></div><div className="prose"><p>We look beyond the post or advert. Landing pages, search visibility, messaging, conversion paths and reporting all influence what happens after someone notices you.</p><p>That wider view helps us recommend the work that matters instead of selling a channel by default.</p><Link className="btn" href="/services">See our services</Link></div></div></section>
<section className="section"><div className="shell"><div className="section-head"><div><div className="kicker">Work</div><h2>Proof should be specific.</h2></div><p>As client work is approved for publication, our case studies will show the brief, the decisions, the delivery and the outcome. No invented logos or anonymous performance claims.</p></div><div className="work-placeholder"><div><small>CASE STUDIES</small><h3>Work worth explaining properly.</h3><p>Our public case-study library will grow as projects become available to share.</p></div><Link href="/work">Our approach →</Link></div></div></section>
</main>}
