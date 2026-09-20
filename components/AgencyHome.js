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
import Industries from "./Industries";
import CapabilityStrip from "./CapabilityStrip";
import { ProcessStory, FaqStory } from "./ScrollStories";
import hero from "./UnifiedHero.module.css";
function Arrow(){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.6"/></svg>}
function Photo({name,alt=""}){return <div className={s.photo} data-photo><Image src={`/home-agency/${name}.webp`} alt={alt} fill sizes="(max-width:700px) 100vw, 55vw"/></div>}
export default function AgencyHome(){
 const root=useRef(null);
 const [paused,setPaused]=useState(false);
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
    scrolling.forEach(e=>{const r=e.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight+100)return;const p=Math.min(1,Math.max(0,(innerHeight-r.top)/(innerHeight*.65)));e.style.setProperty('--progress',p);e.style.setProperty('--pan',`${Math.max(-36,Math.min(36,(innerHeight/2-r.top-r.height/2)*.09))}px`)});
   };
   const request=()=>{if(!frame)frame=requestAnimationFrame(paint)};
   addEventListener('scroll',request,{passive:true});addEventListener('resize',request);paint();
   teardown=()=>{observer.disconnect();cancelAnimationFrame(frame);removeEventListener('scroll',request);removeEventListener('resize',request);targets.forEach(e=>e.classList.remove(s.pending,s.seen));scrolling.forEach(e=>{e.style.removeProperty('--progress');e.style.removeProperty('--pan')});el.style.removeProperty('--hero');el.style.removeProperty('--chapter-progress')};
  }
  setup();mq.addEventListener('change',setup);return()=>{teardown();mq.removeEventListener('change',setup)};
 },[paused]);
 return <div className={`${s.home} ${paused?s.paused:''}`} ref={root}>
 <main id="agency-main">
  <section className={hero.banner} aria-labelledby="home-title">
    <div className={hero.inner}>
      <div className={hero.content}>
        <p className={hero.eyebrow}>YOUR NEXT CHAPTER STARTS HERE</p>
        <h1 id="home-title">Good ideas.<br/>Better websites.<br/><em>Brighter businesses.</em></h1>
        <p className={hero.copy}>We bring websites, brands and digital experiences together to help your business move forward.</p>
        <div className={hero.actions}><Link href="/services" className={hero.cta}>Explore our services</Link><Link href="/contact" className={hero.secondary}>Let’s talk</Link></div>
      </div>
      <div className={hero.visual}><Image src="/home-agency/hero-workspace.webp" alt="A web design workspace with a desktop monitor, mobile preview and paper sketches" fill sizes="(max-width:700px) 92vw, 48vw" preload /></div>
    </div>
    <div className={hero.bottom}><a href="#studio">Scroll to explore ↓</a><button onClick={()=>setPaused(!paused)} aria-pressed={paused}>{paused?'Play page motion':'Pause page motion'}</button></div>

  </section>
  <div className={r.body}>
  <section id="get-started" className={r.startSection} aria-labelledby="start-heading"><svg className={r.heroWave} viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0H1440V25C1170 125 1020 100 720 35S250 150 0 35Z" fill="#0c2948"/></svg><div className={r.startInner}><div><p className={r.label}>YOUR NEXT MOVE</p><h2 id="start-heading">Ready to make it happen?</h2><p>Tell us what you have in mind. We’ll help you find the right place to start.</p></div><Link href="/contact" className={r.startButton}>Get started</Link></div></section>
  <div className={r.studioBanner}><div className={r.bannerImage} data-scroll><Photo name="sketch" alt="Creative team working together on website plans"/></div><div className={r.bannerWords} aria-hidden="true">Strategy<br/>Design<br/>Better Websites<br/>Brighter Brands</div></div>
  <LayeredStudio paused={paused}/>
  <CapabilityStrip paused={paused}/>
  <SelectedConcepts/>
  <Industries/>
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

