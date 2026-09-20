"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CookieConsent from "./CookieConsent";
import s from "./AgencyHome.module.css";
import r from "./ReferenceHome.module.css";
import ServiceCardsPreview from "./ServiceCardsPreview";
import LayeredStudio from "./LayeredStudio";
import WhyJovaPreview from "./WhyJovaPreview";
import SelectedConcepts from "./SelectedConcepts";
import CapabilityStrip from "./CapabilityStrip";
import { ProcessStory, FaqStory } from "./ScrollStories";
import hero from "./UnifiedHero.module.css";
const chapters = [
 {word:"Ideas", title:"A clear idea. A brighter direction.", copy:"We find what makes your business different and turn it into a direction worth following.", visual:"Ideas with impact.", foot:"Strategy with a point of view."},
 {word:"Websites", title:"Built to make your next move.", copy:"Thoughtful design and seamless development. A website that feels like you and works for your customers.", visual:"Make your next move.", foot:"Considered design. Seamless experience."},
 {word:"Brands", title:"Made to mean something.", copy:"A distinctive identity, a consistent voice and content that gives people a reason to remember you.", visual:"Make your mark.", foot:"Distinctive by design."}
];
function Arrow(){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.6"/></svg>}
function Photo({name,alt=""}){return <div className={s.photo} data-photo><Image src={`/home-agency/${name}.webp`} alt={alt} fill sizes="(max-width:700px) 100vw, 55vw"/></div>}
export default function AgencyHome(){
 const root=useRef(null),menuRef=useRef(null);
 const [menu,setMenu]=useState(false),[paused,setPaused]=useState(false),[heroStep,setHeroStep]=useState(0);
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
    el.style.setProperty('--hero',hp);el.style.setProperty('--chapter-progress',Math.min(1,hp*3-nextHero));
    scrolling.forEach(e=>{const r=e.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight+100)return;const p=Math.min(1,Math.max(0,(innerHeight-r.top)/(innerHeight*.65)));e.style.setProperty('--progress',p);e.style.setProperty('--pan',`${Math.max(-36,Math.min(36,(innerHeight/2-r.top-r.height/2)*.09))}px`)});
   };
   const request=()=>{if(!frame)frame=requestAnimationFrame(paint)};
   addEventListener('scroll',request,{passive:true});addEventListener('resize',request);paint();
   teardown=()=>{observer.disconnect();cancelAnimationFrame(frame);removeEventListener('scroll',request);removeEventListener('resize',request);targets.forEach(e=>e.classList.remove(s.pending,s.seen));scrolling.forEach(e=>{e.style.removeProperty('--progress');e.style.removeProperty('--pan')});el.style.removeProperty('--hero');el.style.removeProperty('--chapter-progress')};
  }
  setup();mq.addEventListener('change',setup);return()=>{teardown();mq.removeEventListener('change',setup)};
 },[paused]);
 useEffect(()=>{if(!menu)return;const key=e=>{if(e.key==='Escape'){setMenu(false);menuRef.current?.focus()}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[menu]);
 const goChapter=i=>{
  if(paused||matchMedia('(prefers-reduced-motion: reduce)').matches){setHeroStep(i);return;}
  const node=root.current.querySelector('[data-hero]');
  window.scrollTo({top:window.scrollY+node.getBoundingClientRect().top+(node.offsetHeight-innerHeight)*(i+.18)/3,behavior:'smooth'});
 };
 return <div className={`${s.home} ${paused?s.paused:''}`} ref={root}>
 <a href="#agency-main" className={s.skip}>Skip to content</a>
 <header className={s.header}><a href="#" aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128} preload className={s.logo}/></a><nav className={s.nav} aria-label="Homepage navigation"><a href="#studio">Studio</a><a href="#services">Services</a><a href="#work">Work</a><Link href="/contact">Contact</Link></nav><Link href="/contact" className={`${s.button} ${s.desktopCta}`}>Let&apos;s talk <Arrow/></Link><button ref={menuRef} className={s.menuToggle} aria-expanded={menu} aria-controls="agency-menu" onClick={()=>setMenu(!menu)}>{menu?'Close':'Menu'} {menu?'−':'+'}</button>{menu&&<nav className={s.mobileNav} id="agency-menu" aria-label="Mobile navigation">{[['Work','work'],['Studio','studio'],['Services','services']].map(([label,id])=><a key={id} href={`#${id}`} onClick={()=>setMenu(false)}>{label}</a>)}<Link href="/contact">Contact</Link></nav>}</header>
 <main id="agency-main">
  <section className={hero.scroll} data-hero aria-label="Ideas, websites and brands" data-paused={paused}>
    <div className={hero.panel} data-step={heroStep}>
      <div className={hero.content}>
        <p className={hero.eyebrow}>STRATEGY. DESIGN. DIGITAL.</p>
        <h1>Good ideas.<br/><em>Distinctive digital.</em></h1>
        <div className={hero.story} key={heroStep}><p>{chapters[heroStep].copy}</p></div>
        <a className={hero.cta} href="#studio">Meet your digital partner</a>
      </div>
      <div className={hero.showcase} aria-label="From creative direction to websites and brand identity">
        {[
          ['hero-crafted-ideas','Ideas','Find your direction','A sculptural paper ribbon turning pencil sketches into a finished graphic idea'],
          ['hero-crafted-websites','Websites','Build your next chapter','An architectural website presented on a graphite laptop and phone'],
          ['hero-crafted-brands','Brands','Make a lasting impression','An embossed identity manual, letterpress cards and vermilion packaging']
        ].map(([image,name,caption,alt],i)=><div className={hero.project} key={image} data-position={i} data-slot={(i-heroStep+3)%3} data-featured={heroStep===i}>
          <div className={hero.projectScreen}><Image src={`/home-agency/${image}.webp`} alt={alt} fill sizes="(max-width:700px) 80vw, 45vw" preload={i===0}/></div>
          <div className={hero.projectBar}><span>0{i+1} / {name}</span><span>{caption}</span></div>
        </div>)}
      </div>
      <div className={hero.bottom}>
        <nav className={hero.chapters} aria-label="Explore our approach">{chapters.map((chapter,i)=><button key={chapter.word} onClick={()=>goChapter(i)} aria-pressed={heroStep===i} data-active={heroStep===i}><small>0{i+1}</small><span>{chapter.word}</span><i aria-hidden="true"/></button>)}</nav>
        <div className={hero.controls}><span>Scroll to explore ↓</span><button onClick={()=>setPaused(!paused)} aria-pressed={paused}>{paused?'Play motion':'Pause motion'}</button></div>
      </div>
    </div>
  </section>
  <div className={r.body}>
  <div className={r.studioBanner}><div className={r.bannerImage} data-scroll><Photo name="sketch" alt="Creative team working together on website plans"/></div><div className={r.bannerWords} aria-hidden="true">Strategy<br/>Design<br/>Better Websites<br/>Brighter Brands</div></div>
  <LayeredStudio paused={paused}/>
  <CapabilityStrip paused={paused}/>
  <SelectedConcepts/>
  <ServiceCardsPreview paused={paused}/>
  <ProcessStory paused={paused}/>
  <WhyJovaPreview/>
  <FaqStory paused={paused}/>
  <section className={r.contact}><div data-reveal><p className={r.label}>(07) LET&apos;S TALK</p><h2>LET&apos;S MAKE<br/>IT HAPPEN.</h2></div><Link className={r.bigCircle} href="/contact" aria-label="Start a project"><Arrow/></Link><div><p>Get in touch and let&apos;s build<br/>something great together.</p><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a></div></section>
  </div>
 </main>
 <footer className={r.footer}><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128} className={r.logo}/><div><h3>Studio</h3><Link href="/about">Our story</Link><a href="#services">What we do</a><a href="#studio">Our approach</a></div><div><h3>Services</h3><Link href="/services">Explore our services</Link><Link href="/contact">Start a project</Link></div><div><h3>Contact</h3><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><CookieConsent/></div><p>© {new Date().getFullYear()} JovaMedia<br/>Distinctive digital experiences.</p></footer>
 </div>;
}

