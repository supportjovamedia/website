"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./DaybreakPreview.module.css";

function CoffeeSite(){return (<article className="siteCopy coffeeSite">
<div className="coffeeNav"><strong><i aria-hidden="true"></i>daybreak<span>coffee, daily.</span></strong><span>Our menu &nbsp;&nbsp; Rewards &nbsp;&nbsp; Our story &nbsp;&nbsp; <b>Find us</b></span><i className="coffeeMobileMenu">☰</i></div>
<div className="coffeeHero"><span className="coffeeOutline">COFFEE.</span><h2>Good coffee.<br/>Better days.</h2><p>Small-batch roasts and fresh bakes,<br/>ready when you are.</p><span className="coffeeButton">See the menu</span><div className="leafLayer"><Image src="/hero-daybreak/leaves.webp" alt="" width={1000} height={783} sizes="(max-width:800px) 18vw, 12vw" loading="eager"/></div><div className="productLayer"><Image src="/hero-daybreak/coffee-cup.webp" alt="" width={1141} height={1141} sizes="(max-width:800px) 28vw, 17vw" loading="eager"/></div><div className="beanLayer"><Image src="/hero-daybreak/beans.webp" alt="" width={230} height={230} sizes="(max-width:800px) 8vw, 5vw" loading="eager"/></div></div>
<div className="coffeeRibbon"><span>GOOD COFFEE. GOOD COMPANY.</span></div>
<div className="coffeeMenu"><div className="menuIntro"><h3>Find your favourite.</h3><span>Coffee &nbsp; Iced &nbsp; Bakes</span></div><div className="menuProducts"><div className="menuProduct"><div className="productPhoto cupPhoto"><Image src="/hero-daybreak/coffee-cup.webp" alt="" width={1141} height={1141} sizes="(max-width:800px) 28vw, 17vw" loading="eager"/></div><strong>Proper flat white <span>+</span></strong><small>Velvety milk. A little morning magic.</small></div><div className="menuProduct"><div className="productPhoto icedPhoto"><Image src="/hero-daybreak/coffee-glass.webp" alt="" width={700} height={1050} sizes="(max-width:800px) 46vw, 28vw" loading="lazy"/></div><strong>Iced & easy <span>+</span></strong><small>Cool, creamy, everyday goodness.</small></div><div className="menuProduct"><div className="productPhoto"><Image src="/hero-daybreak/croissant.webp" alt="" width={600} height={900} sizes="(max-width:800px) 24vw, 14vw" loading="lazy"/></div><strong>Golden mornings <span>+</span></strong><small>Fresh from the oven, every morning.</small></div></div></div>
<div className="coffeeClub"><span>Your daily ritual, rewarded.</span><h3>Good coffee.<br/>Great company.</h3><p>A little thank you for making us part of your day.</p><span className="coffeeButton">Join the Daybreak Club</span><div className="clubCard"><strong>daybreak<span>club</span></strong><div className="clubStamps"><i></i><i></i><i></i><i></i><i></i><i></i></div><small>Your next good day is on us.</small></div></div><div className="coffeeFooter"><span>See you in the morning.</span><strong>daybreak</strong><span>Our menu &nbsp;&nbsp; Our story &nbsp;&nbsp; Find us</span></div></article>);}


export default function DaybreakPreview({ onReady }) {
 const root = useRef(null);
 useEffect(() => {
  const element = root.current;
  const tracks = [...element.querySelectorAll('.scrollTrack')];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, visible = false, ready = false, measuredSize = '';
  let layers = [];

  const sync = () => {
   const playing = ready && visible && !document.hidden && !media.matches;
   element.classList.toggle('paused', !playing);
   const times = new Map(tracks.map(track => [track, Number(track.getAnimations()[0]?.currentTime) || 0]));
   layers.forEach(({ animation, track }) => {
    animation.currentTime = times.get(track);
    if (playing) animation.play();
    else animation.pause();
   });
  };

  const addLayer = (target, track, start, end, from, to) => {
   // The duplicate copy only enters at the end of the loop. Its hero has not
   // started scrolling yet, so its normal CSS transform is already correct.
   if (start >= 1 || end <= start) return;
   const animation = target.animate([
    { offset: 0, transform: from },
    { offset: start, transform: from },
    { offset: end, transform: to },
    { offset: 1, transform: to },
   ], { duration: 20000, iterations: Infinity, easing: 'linear' });
   animation.pause();
   layers.push({ animation, track });
  };

  const measure = (force = false) => {
   if (!ready || disposed) return;
   const size = tracks.map(track => `${track.parentElement.clientWidth}:${track.parentElement.clientHeight}`).join('|');
   if (!force && size === measuredSize) return;
   measuredSize = size;
   const groups = tracks.map(track => ({ track, copies: [...track.children] }));
   groups.forEach(({ copies }) => copies.forEach(copy => { copy.style.height = 'auto'; }));
   const distances = groups.map(({ copies }) => Math.ceil(copies[0].getBoundingClientRect().height));
   groups.forEach(({ track, copies }, index) => {
    copies.forEach(copy => { copy.style.height = `${distances[index]}px`; });
    track.style.setProperty('--loop-end', `${-distances[index]}px`);
   });
   const geometry = groups.flatMap(({ track, copies }, index) => copies.map(copy => {
    const hero = copy.querySelector('.coffeeHero');
    return { track, hero, height: hero.offsetHeight, top: copy.offsetTop + hero.offsetTop, distance: distances[index] };
   }));
   layers.forEach(({ animation }) => animation.cancel());
   layers = [];
   geometry.forEach(({ track, hero, height, top, distance }) => {
    const start = Math.min(1, .1 + .8 * top / distance);
    const end = Math.min(1, .1 + .8 * (top + height) / distance);
    addLayer(hero.querySelector('.productLayer'), track, start, end,
     'translateY(0px) rotate(-18deg)', `translateY(${height * .12}px) rotate(${-18 + height * .012}deg)`);
    addLayer(hero.querySelector('.coffeeOutline'), track, start, end,
     'translateY(0px)', `translateY(${-height * .1}px)`);
    addLayer(hero.querySelector('.leafLayer'), track, start, end,
     'translateY(0px) rotate(-22deg)', `translateY(${-height * .08}px) rotate(-22deg)`);
    addLayer(hero.querySelector('.beanLayer'), track, start, end,
     'translateY(0px) rotate(-24deg)', `translateY(${height * .06}px) rotate(-24deg)`);
   });
   sync();
  };

  const resize = new ResizeObserver(() => measure());
  tracks.forEach(track => resize.observe(track.parentElement));
  const intersection = new IntersectionObserver(entries => {
   visible = entries[0].isIntersecting;
   sync();
  });
  intersection.observe(element);
  document.addEventListener('visibilitychange', sync);
  media.addEventListener('change', sync);
  const images = [...element.querySelectorAll('.deviceFrame, .coffeeHero img')];
  Promise.all([
   document.fonts.ready, document.fonts.load('750 24px Outfit'), document.fonts.load('600 24px Geist'),
   ...images.map(image => image.decode().catch(() => {})),
  ]).then(() => {
   if (disposed || images.some(image => !image.naturalWidth)) return;
   ready = true;
   measure(true);
   element.classList.add('ready');
   sync();
   onReady();
  });
  return () => {
   disposed = true;
   resize.disconnect();
   intersection.disconnect();
   layers.forEach(({ animation }) => animation.cancel());
   document.removeEventListener('visibilitychange', sync);
   media.removeEventListener('change', sync);
  };
 }, [onReady]);
 return <div ref={root} className={`${styles.preview} livePreview`} aria-hidden="true"><div className="backdrop" aria-hidden="true"></div><div className="browser device" aria-hidden="true"><Image className="deviceFrame" src="/device-frames/macbook-pro.webp" alt="" width={1208} height={700} sizes="(max-width:800px) 90vw, 58vw" loading="eager" fetchPriority="high"/><div className="deviceScreen"><div className="browserBar"><span className="dots"><i></i><i></i><i></i></span><span className="address"><svg viewBox="0 0 16 16" fill="none"><rect x="4.5" y="7" width="7" height="6" rx="1.3" stroke="currentColor"/><path d="M6 7V5a2 2 0 0 1 4 0v2" stroke="currentColor"/></svg>daybreak.coffee</span><span className="browserPlus">+</span></div><div className="screen"><div className="scrollTrack" data-screen="desktop">{[0,1].map(copy => <CoffeeSite key={copy}/>)}</div></div></div></div><div className="phone device" aria-hidden="true"><Image className="deviceFrame" src="/device-frames/iphone-x.webp" alt="" width={726} height={1444} sizes="(max-width:800px) 22vw, 14vw" loading="eager"/><div className="screen"><div className="scrollTrack" data-screen="phone">{[0,1].map(copy => <CoffeeSite key={copy}/>)}</div></div></div></div>;
}
