"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CookieConsent from "./CookieConsent";
import s from "./AgencyHome.module.css";
import r from "./ReferenceHome.module.css";
import ServiceArtwork from "./ServiceArtwork";
import LayeredStudio from "./LayeredStudio";
const services = [
 ["Website Development", "Beautiful, high-performing websites that convert.", "web-design", "desk"],
 ["Copywriting", "Words that work harder for your business.", "content", "book"],
 ["Social Media Management", "Content that builds real connection.", "social-management", "fitness"],
 ["Brand Strategy & Design", "Strategy. Identity. A stronger tomorrow.", "brand-strategy", "sketch"],
 ["Email Marketing & Automation", "Turn audiences into loyal customers.", "email-marketing", "plant"],
 ["Content Production", "Photo, video and content that brings your brand to life.", "content-production", "camera"]
];
const chapters = [
 {word:"Ideas", title:"A clear idea. A brighter direction.", copy:"We find what makes your business different and turn it into a direction worth following.", visual:"Ideas with impact.", foot:"Strategy with a point of view."},
 {word:"Websites", title:"Built to make your next move.", copy:"Thoughtful design and seamless development. A website that feels like you and works for your customers.", visual:"Make your next move.", foot:"Considered design. Seamless experience."},
 {word:"Brands", title:"Made to mean something.", copy:"A distinctive identity, a consistent voice and content that gives people a reason to remember you.", visual:"Make your mark.", foot:"Distinctive by design."}
];
const articles = [
 {name:"What makes a website work harder",image:"desk",label:"Web design",paragraphs:["Start with the question your visitor needs answered: is this right for me? A clear headline, relevant work and an easy next step do more than a page full of competing messages.","Design the mobile experience first. Keep text readable, make buttons easy to reach and give every section a purpose. Test the enquiry journey, not just the appearance."]},
 {name:"A stronger brand starts with clarity",image:"sketch",label:"Branding",paragraphs:["A brand becomes recognisable when the decisions behind it are consistent. Know who you are speaking to, what you help them do and what makes your approach different.","Use that direction across your words, photography, colour and layout. A useful identity gives your business a repeatable way to show up, rather than a different look on every channel."]},
 {name:"Connecting your digital touchpoints",image:"camera",label:"Digital strategy",paragraphs:["Your website, social channels and emails should feel like parts of one conversation. Agree the central message, then adapt its format to the place your audience will see it.","Give each channel a job. Social can introduce an idea, your website can explain it and email can continue the conversation. Make the path between them clear and keep it useful."]}
];
function Arrow(){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.6"/></svg>}
function Photo({name,alt=""}){return <div className={s.photo} data-photo><Image src={`/home-agency/${name}.webp`} alt={alt} fill sizes="(max-width:700px) 100vw, 55vw"/></div>}
function HeroPreview({mode}){
 return <div className={s.heroPhotography} data-mode={mode}>
  {chapters.map((chapter,i)=><div key={chapter.word} className={s.heroPhotoLayer} data-active={mode===i} aria-hidden={mode!==i}>
   <Image src={`/home-agency/hero-${chapter.word.toLowerCase()}.webp`} alt={['Designer working with colour samples and creative materials','Laptop in a sunlit contemporary workspace','Brand strategy moodboard with colour palettes and print layouts'][i]} fill sizes="(max-width:700px) 100vw,60vw" preload={i===0}/>
   <div className={s.photoShade}/>
   <div className={s.photoChapter}><span>JOVA / {chapter.word.toUpperCase()}</span><span>0{i+1} / 03</span></div>
   <div className={s.photoStory}><span className={s.photoKicker}>{['THINK CLEARER','BUILD BETTER','BE REMEMBERED'][i]}</span><h2>{chapter.title}</h2><p>{chapter.copy}</p></div>
  </div>)}
  <div className={s.photoCorner} aria-hidden="true"><Arrow/></div>
 </div>
}
export default function AgencyHome(){
 const root=useRef(null), modal=useRef(null),lastTrigger=useRef(null),menuRef=useRef(null);
 const [menu,setMenu]=useState(false),[selection,setSelection]=useState(null),[paused,setPaused]=useState(false),[heroStep,setHeroStep]=useState(0);
 useEffect(()=>{
  const el=root.current,mq=matchMedia('(prefers-reduced-motion: reduce)');let teardown=()=>{};
  function setup(){
   teardown();if(mq.matches||paused)return;
   const targets=[...el.querySelectorAll('[data-reveal]')],scrolling=[...el.querySelectorAll('[data-scroll]')];
   const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add(s.seen);observer.unobserve(e.target)}}),{threshold:.06});
   targets.forEach(e=>{if(e.getBoundingClientRect().top>innerHeight*.94){e.classList.add(s.pending);observer.observe(e)}});
   let frame=0;
   const paint=()=>{
    frame=0;
    const hero=el.querySelector('[data-hero]'),hr=hero.getBoundingClientRect(),hp=Math.min(1,Math.max(0,-hr.top/Math.max(1,hr.height-innerHeight)));
    const nextHero=Math.min(2,Math.floor(hp*3));setHeroStep(previous=>previous===nextHero?previous:nextHero);
    el.style.setProperty('--hero',hp);el.style.setProperty('--chapter-progress',Math.min(1,(hp*3)%1));
    const process=el.querySelector('[data-process]'),pr=process.getBoundingClientRect(),ps=Math.min(3,Math.max(0,Math.floor((innerHeight*.85-pr.top)/(innerHeight*.55)*4)));
    process.querySelectorAll('li').forEach((li,i)=>li.dataset.current=String(i===ps));
    scrolling.forEach(e=>{const r=e.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight+100)return;const p=Math.min(1,Math.max(0,(innerHeight-r.top)/(innerHeight*.65)));e.style.setProperty('--progress',p);e.style.setProperty('--pan',`${Math.max(-36,Math.min(36,(innerHeight/2-r.top-r.height/2)*.09))}px`)});
   };
   const request=()=>{if(!frame)frame=requestAnimationFrame(paint)};
   addEventListener('scroll',request,{passive:true});addEventListener('resize',request);paint();
   teardown=()=>{observer.disconnect();cancelAnimationFrame(frame);removeEventListener('scroll',request);removeEventListener('resize',request);targets.forEach(e=>e.classList.remove(s.pending,s.seen));scrolling.forEach(e=>{e.style.removeProperty('--progress');e.style.removeProperty('--pan')});el.style.removeProperty('--hero');el.style.removeProperty('--chapter-progress')};
  }
  setup();mq.addEventListener('change',setup);return()=>{teardown();mq.removeEventListener('change',setup)};
 },[paused]);
 useEffect(()=>{if(!selection)return;modal.current.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[selection]);
 useEffect(()=>{if(!menu)return;const key=e=>{if(e.key==='Escape'){setMenu(false);menuRef.current?.focus()}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[menu]);
 const open=(item,event)=>{lastTrigger.current=event.currentTarget;setSelection(item)};
 const close=()=>{modal.current.close();setSelection(null);lastTrigger.current?.focus()};
 const goChapter=i=>{
  if(paused||matchMedia('(prefers-reduced-motion: reduce)').matches){setHeroStep(i);return;}
  const node=root.current.querySelector('[data-hero]');
  window.scrollTo({top:window.scrollY+node.getBoundingClientRect().top+(node.offsetHeight-innerHeight)*(i+.18)/3,behavior:'smooth'});
 };
 return <div className={`${s.home} ${paused?s.paused:''}`} ref={root}>
 <a href="#agency-main" className={s.skip}>Skip to content</a>
 <header className={s.header}><a href="#" aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128} preload className={s.logo}/></a><nav className={s.nav} aria-label="Homepage navigation"><a href="#studio">Studio</a><a href="#services">Services</a><a href="#work">Work</a><Link href="/contact">Contact</Link></nav><Link href="/contact" className={`${s.button} ${s.desktopCta}`}>Let&apos;s talk <Arrow/></Link><button ref={menuRef} className={s.menuToggle} aria-expanded={menu} aria-controls="agency-menu" onClick={()=>setMenu(!menu)}>{menu?'Close':'Menu'} {menu?'−':'+'}</button>{menu&&<nav className={s.mobileNav} id="agency-menu" aria-label="Mobile navigation">{[['Work','work'],['Studio','studio'],['Services','services']].map(([label,id])=><a key={id} href={`#${id}`} onClick={()=>setMenu(false)}>{label}</a>)}<Link href="/contact">Contact</Link></nav>}</header>
 <main id="agency-main">
  <section className={s.chapterHero} data-hero aria-label="Ideas, websites and brands"><div className={s.heroSticky}>
   <div className={s.chapterLeft}><p className={s.heroEyebrow}><span/> JOVAMEDIA. INDEPENDENT BY DESIGN.</p><h1>Digital. Done right.</h1><div className={s.chapterWords} aria-label="Explore our approach"><div className={s.chapterWordTrack} style={{"--step":heroStep}}>{chapters.map((chapter,i)=><button key={chapter.word} onClick={()=>goChapter(i)} data-active={heroStep===i} aria-pressed={heroStep===i}><small>0{i+1}</small><span>{chapter.word}<i>.</i></span><span className={s.chapterArrow} aria-hidden="true">↗</span></button>)}</div></div><div className={s.chapterHint}><span>Scroll to explore</span><span>↓</span><a href="#studio">Meet the studio</a></div></div>
   <div className={s.chapterRight}><HeroPreview mode={heroStep}/><div className={s.heroCaption}><span>0{heroStep+1} / 03 <span className={s.chapterTrack}><i/></span></span><button onClick={()=>setPaused(!paused)} aria-pressed={paused}>{paused?'Play motion':'Pause motion'} <span aria-hidden="true">{paused?'▶':'Ⅱ'}</span></button></div></div>
  </div></section>
  <div className={r.body}>
  <div className={r.studioBanner}><div className={r.bannerImage} data-scroll><Photo name="sketch" alt="Creative team working together on website plans"/></div><div className={r.bannerWords} aria-hidden="true">Strategy<br/>Design<br/>Better Websites<br/>Brighter Brands</div></div>
  <LayeredStudio paused={paused}/>
  <div className={r.marquee} aria-label="Web design. Development. Digital thinking."><div aria-hidden="true">{[0,1].map(n=><span key={n}>WEB DESIGN <b>✦</b> DEVELOPMENT <b>✦</b> DIGITAL THINKING <b>✦</b> </span>)}</div></div>
  <section className={r.work} id="work"><div className={r.sectionHeading} data-reveal><div><p className={r.label}>(02) SELECTED CONCEPTS</p><h2>Digital experiences.<br/>Made to stand out.</h2></div><Link href="/work" className={r.textLink}>View all work <Arrow/></Link></div><div className={r.projectGrid}>{[
   {name:'Coast',image:'coast',title:'Explore a wider world.',label:'Travel website concept',paragraphs:['An independent travel website exploration, built around coastal photography and a clear journey from inspiration to enquiry. This is illustrative concept work.']},
   {name:'Form Studio',image:'fitness',title:'STRONGER PEOPLE. BRIGHTER DAYS.',label:'Web design & development concept',paragraphs:['An independent fitness studio concept with confident typography and a focused route into the studio experience. This is illustrative concept work.']},
   {name:'Objects',image:'objects',title:'Objects for a calmer home.',label:'E-commerce website concept',paragraphs:['An independent homeware concept exploring a considered collection, warm photography and a simple shopping experience. This is illustrative concept work.']}
  ].map((project,i)=><article key={project.name} className={`${r.project} ${r['project'+i]}`} data-reveal><button className={`${r.projectVisual} ${r['visual'+i]}`} onClick={e=>open(project,e)} aria-label={`Explore ${project.name} concept`}><div className={r.projectPhoto} data-scroll><Photo name={project.image}/></div><div className={r.projectNav}><b>{i===1?'FORM':project.name}</b><span>{i===2?'Shop    Journal    About':i===1?'Training    Nutrition    Community':'Destinations    Journal    About'}</span></div><strong>{project.title}</strong><span className={r.projectSub}>{['Travel / Stay / Experience.','MOVE FURTHER TOGETHER','Thoughtful living for modern life.'][i]}</span><span className={r.circle}><Arrow/></span></button><h3>{project.name}</h3><p>{project.label}</p></article>)}<Link href="/contact" className={r.nextProject} data-reveal><Photo name="coast"/><span>Your project<br/>could be next.</span><span className={r.circle}><Arrow/></span></Link></div></section>
  <section className={r.services} id="services"><div className={r.sectionHeading} data-reveal><div><p className={r.label}>(03) OUR SERVICES</p><h2>Everything you need to grow.</h2></div><p>Six integrated services. One seamless partner.<br/>Strategy, content and technology working as one.</p></div><div className={r.serviceGrid}>{services.map(([title,copy,slug],i)=><Link href={`/services/${slug}`} className={r.serviceCard} data-reveal key={slug} style={{'--delay':`${i*65}ms`}}><div className={r.serviceText}><h3>{title}</h3><p>{copy}</p></div><div className={r.serviceArt}><ServiceArtwork index={i}/></div><span className={r.circle}><Arrow/></span></Link>)}</div></section>
  <section className={r.process} data-process><div data-reveal><p className={r.label}>(04) OUR PROCESS</p><h2>From first idea<br/>to final launch.</h2></div><ol>{[['Discover','We learn about your goals and opportunities.'],['Design','We create and refine the right solution.'],['Develop','We build, test and bring it to life.'],['Launch','We get you live and help you grow.']].map(([name,copy],i)=><li key={name} data-reveal style={{'--delay':`${i*90}ms`}}><span>0{i+1}</span><h3>{name}</h3><p>{copy}</p></li>)}</ol></section>
  <section className={r.why}><div data-reveal><p className={r.label}>(05) WHY JOVA</p><h2>A digital partner.<br/>Not just a deliverable.</h2></div>{[['Thoughtful design','Ideas with purpose, not just aesthetics.'],['Built around your goals','Solutions that fit your business.'],['Care beyond launch','Ongoing support when you need it.']].map(([name,copy],i)=><div className={r.value} data-scroll key={name} style={{'--value-order':i}}><span aria-hidden="true" className={r.valueIcon}><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18"/><path d={['M12 24 24 12 36 24 24 36Z','M24 7v34M7 24h34M15 15l18 18','M12 31 24 12 36 31Z'][i]}/></svg></span><div><h3>{name}</h3><p>{copy}</p></div></div>)}</section>
  <section className={r.faq}><div data-reveal><p className={r.label}>(06) FAQ</p><h2>Good questions.<br/>Clear answers.</h2></div><div data-reveal>{[['Can you redesign my existing website?','Yes. We start by understanding your goals and reviewing your current site, then agree what to keep, improve or rebuild.'],['What digital services do you offer?','Website development, copywriting, social media, brand strategy and design, email marketing and automation, and content production.'],['How does a project get started?','Tell us about your business and what you want to achieve. We will discuss priorities, scope and a practical plan before work begins.'],['Can you support us after launch?','Yes. Website care, content and ongoing support can be agreed around what your business needs.']].map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
  <section className={r.insights} id="insights"><div className={r.sectionHeading} data-reveal><div><p className={r.label}>(07) INSIGHTS</p><h2>Ideas for your next move.</h2></div><Link href="/insights" className={r.textLink}>View all articles <Arrow/></Link></div><div className={r.articleGrid}>{articles.map(article=><button key={article.name} onClick={e=>open(article,e)} data-reveal><Photo name={article.image}/><span>{article.label}</span><div><h3>{article.name}</h3><Arrow/></div></button>)}</div></section>
  <section className={r.contact}><div data-reveal><p className={r.label}>(08) LET&apos;S TALK</p><h2>LET&apos;S MAKE<br/>IT HAPPEN.</h2></div><Link className={r.bigCircle} href="/contact" aria-label="Start a project"><Arrow/></Link><div><p>Get in touch and let&apos;s build<br/>something great together.</p><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a></div></section>
  </div>
 </main>
 <footer className={r.footer}><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128} className={r.logo}/><div><h3>Studio</h3><Link href="/about">Our story</Link><a href="#services">What we do</a><a href="#studio">Our approach</a></div><div><h3>Services</h3><Link href="/services">Explore our services</Link><Link href="/contact">Start a project</Link></div><div><h3>Contact</h3><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><CookieConsent/></div><p>© {new Date().getFullYear()} JovaMedia<br/>Distinctive digital experiences.</p></footer>
 <dialog ref={modal} className={s.modal} aria-labelledby="agency-dialog-title" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}}>{selection&&<div><button onClick={close} autoFocus className={s.close}>Close ×</button><Photo name={selection.image}/><div className={s.modalCopy}><p className={s.label}>{selection.label}</p><h2 id="agency-dialog-title">{selection.name}</h2>{selection.paragraphs.map(p=><p key={p}>{p}</p>)}<Link href="/contact" className={s.button}>Talk about your project</Link></div></div>}</dialog>
 </div>;
}

