"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import ConsultationLink from "./ConsultationLink";
import styles from "./DaybreakHero.module.css";
import { WhatsAppIcon } from "./BusinessContact";
import { whatsappLink } from "@/lib/business-contact.mjs";

function CoffeeSite(){return (<article className="siteCopy coffeeSite">
<div className="coffeeNav"><strong><i aria-hidden="true"></i>daybreak<span>coffee, daily.</span></strong><span>Our menu &nbsp;&nbsp; Rewards &nbsp;&nbsp; Our story &nbsp;&nbsp; <b>Find us</b></span><i className="coffeeMobileMenu">☰</i></div>
<div className="coffeeHero"><span className="coffeeOutline">COFFEE.</span><h2>Good coffee.<br/>Better days.</h2><p>Small-batch roasts and fresh bakes,<br/>ready when you are.</p><span className="coffeeButton">See the menu</span><div className="leafLayer"><img src="/hero-daybreak/leaves.webp" alt="" width="1200" height="939"/></div><div className="productLayer"><img src="/hero-daybreak/coffee-cup.webp" alt="" width="1141" height="1060"/></div><div className="beanLayer"><img src="/hero-daybreak/beans.webp" alt="" width="230" height="230"/></div></div>
<div className="coffeeRibbon"><span>GOOD COFFEE. GOOD COMPANY.</span></div>
<div className="coffeeMenu"><div className="menuIntro"><h3>Find your favourite.</h3><span>Coffee &nbsp; Iced &nbsp; Bakes</span></div><div className="menuProducts"><div className="menuProduct"><div className="productPhoto cupPhoto"><img src="/hero-daybreak/coffee-cup.webp" alt="" width="1141" height="1060"/></div><strong>Proper flat white <span>+</span></strong><small>Velvety milk. A little morning magic.</small></div><div className="menuProduct"><div className="productPhoto icedPhoto"><img src="/hero-daybreak/coffee-glass.webp" alt="" width="1600" height="2400"/></div><strong>Iced & easy <span>+</span></strong><small>Cool, creamy, everyday goodness.</small></div><div className="menuProduct"><div className="productPhoto"><img src="/hero-daybreak/croissant.webp" alt="" width="1200" height="1800"/></div><strong>Golden mornings <span>+</span></strong><small>Fresh from the oven, every morning.</small></div></div></div>
<div className="coffeeClub"><span>Your daily ritual, rewarded.</span><h3>Good coffee.<br/>Great company.</h3><p>A little thank you for making us part of your day.</p><span className="coffeeButton">Join the Daybreak Club</span><div className="clubCard"><strong>daybreak<span>club</span></strong><div className="clubStamps"><i></i><i></i><i></i><i></i><i></i><i></i></div><small>Your next good day is on us.</small></div></div><div className="coffeeFooter"><span>See you in the morning.</span><strong>daybreak</strong><span>Our menu &nbsp;&nbsp; Our story &nbsp;&nbsp; Find us</span></div></article>);}

export default function DaybreakHero(){
 const root=useRef(null);
 const [paused,setPaused]=useState(false);
 useEffect(()=>{
  const el=root.current,showcase=el.querySelector('.showcase'),tracks=[...el.querySelectorAll('.scrollTrack')],media=matchMedia('(prefers-reduced-motion: reduce)');
  let disposed=false,visible=false,frame=0,geometry=[];
  // Geometry changes only after layout, asset loading or resize, never per frame.
  const measure=()=>{
    const groups=tracks.map(track=>({track,copies:[...track.children]}));
    groups.forEach(({copies})=>copies.forEach(copy=>{copy.style.height='auto';}));
    const heights=groups.map(({copies})=>Math.ceil(copies[0].getBoundingClientRect().height));
    groups.forEach(({track,copies},index)=>{copies.forEach(copy=>{copy.style.height=heights[index]+'px';});track.style.setProperty('--loop-end',-heights[index]+'px');});
    geometry=groups.map(({track,copies},index)=>({track,distance:heights[index],copies:copies.map(copy=>{const hero=copy.querySelector('.coffeeHero');return {hero,height:hero.offsetHeight,top:copy.offsetTop+hero.offsetTop};})}));
  };
  const paint=()=>{frame=0;for(const {track,distance,copies} of geometry){const animation=track.getAnimations()[0],time=animation&&Number(animation.currentTime)||0,phase=(time%20000)/20000,progress=Math.max(0,Math.min(1,(phase-.1)/.8));for(const {hero,height,top} of copies){const scroll=media.matches?0:Math.max(0,Math.min(height,distance*progress-top));hero.style.setProperty('--product-y',scroll*.12+'px');hero.style.setProperty('--product-angle',scroll*.012+'deg');hero.style.setProperty('--outline-y',-scroll*.1+'px');hero.style.setProperty('--leaf-y',-scroll*.08+'px');hero.style.setProperty('--bean-y',scroll*.06+'px');}}if(!disposed&&visible&&!document.hidden&&!media.matches&&!paused)frame=requestAnimationFrame(paint);};
  const sync=()=>{showcase.classList.toggle('paused',!visible||document.hidden||media.matches||paused);cancelAnimationFrame(frame);paint();};
  const resize=new ResizeObserver(measure);tracks.forEach(track=>resize.observe(track.parentElement));
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});intersection.observe(el);
  document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);
  Promise.all([document.fonts.ready,...[...el.querySelectorAll('img')].map(img=>img.decode().catch(()=>{}))]).then(()=>{if(disposed)return;measure();showcase.classList.add('ready');sync();});
  return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);};
 },[paused]);
 return <section ref={root} className={styles.root} aria-labelledby="home-title"><div className="shell"><div className="hero"><div className="message"><h1 id="home-title">Website design<br/><span>for small businesses.</span></h1><p className="description">Beautiful, custom-built websites designed around your business.</p><p className="previewPromise">Your personalised homepage preview <strong>in 48 hours.</strong> No commitment.</p><div className="actions"><ConsultationLink className="primary" placement="hero">free website preview</ConsultationLink><a className="secondary whatsappAction" href={whatsappLink("hero")} target="_blank" rel="noopener noreferrer" data-contact-placement="hero"><WhatsAppIcon />Chat on WhatsApp</a></div><p className="coverage">London-based. Working across the UK.</p></div><div className="previewWrap"><div className="showcase" role="img" aria-label="Daybreak coffee website design concept shown on desktop and phone screens"><div className="backdrop" aria-hidden="true"></div><div className="browser device" aria-hidden="true"><div className="browserBar"><span className="dots"><i></i><i></i><i></i></span><span className="address">daybreak.coffee</span><span className="browserPlus">+</span></div><div className="screen"><div className="scrollTrack" data-screen="desktop">{[0,1].map(copy => <CoffeeSite key={copy}/>)}</div></div></div><div className="phone device" aria-hidden="true"><div className="phoneSpeaker"></div><div className="screen"><div className="scrollTrack" data-screen="phone">{[0,1].map(copy => <CoffeeSite key={copy}/>)}</div></div></div></div><button className="previewControl" type="button" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused ? "Play preview" : "Pause preview"}</button></div></div></div></section>;
}
