"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import s from "./ScrollStories.module.css";

const steps = [
  ["Discover", "We learn about your business, your audience and where you want to go.", "A clear direction", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4 5-2 6-6 2 2-6 6-2Z"],
  ["Design", "We turn that direction into a distinctive design, refined together with you.", "Made to feel like you", "m5 16-1 4 4-1L20 7l-3-3L5 16Zm9-9 3 3"],
  ["Develop", "We build, test and fine-tune the experience across every screen.", "Built to work beautifully", "m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"],
  ["Launch", "We get you live with confidence, with the support to keep moving forward.", "Ready for what comes next", "M14 4c3-2 6-2 6-2s0 3-2 6l-6 6-5-5 7-5ZM7 9H3l-1 5 6-1m4 1-1 6 5-1v-4M5 17l-3 5 5-3"],
];
const questions = [
  ["Can you redesign my existing website?", "Yes. We start by understanding your goals and reviewing your current site, then agree what to keep, improve or rebuild."],
  ["What digital services do you offer?", "Website development, system modernization, social media, brand strategy and design, copywriting, email marketing and automation and search and local visibility."],
  ["How does a project get started?", "Tell us about your business and what you want to achieve. We will discuss priorities, scope and a practical plan before work begins."],
  ["Can you support us after launch?", "Yes. Website care, content and ongoing support can be agreed around what your business needs."],
];

// One event-driven frame per scroll. Content remains readable without motion or JS.
function useStoryMotion(ref, paused) {
  useEffect(() => {
    const root = ref.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine)");
    let frame = 0, observer;
    const paint = () => {
      frame = 0;
      const staticMode = paused || reduced.matches;
      root.dataset.static = String(staticMode);
      const rect = root.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
      root.style.setProperty("--travel", staticMode ? 0 : (0.5 - progress) * 300);
      root.style.setProperty("--ink", `${staticMode ? 100 : Math.max(0, Math.min(100, (innerHeight * .9 - rect.top) / (innerHeight * .5) * 100))}%`);
      const cards = [...root.querySelectorAll("[data-story-card]")];
      let nearest = 0, distance = Infinity;
      cards.forEach((card, i) => {
        const box = card.getBoundingClientRect();
        const d = Math.abs(box.top + box.height / 2 - innerHeight * .48);
        if (d < distance) { distance = d; nearest = i; }
        const reveal = Math.max(0, Math.min(1, (innerHeight * .95 - box.top) / (innerHeight * .35)));
        card.style.setProperty("--reveal", staticMode ? 1 : reveal);
      });
      cards.forEach((card, i) => { card.dataset.current = String(i === nearest); });
      root.style.setProperty("--line", `${(nearest + .5) / cards.length * 100}%`);
    };
    const request = () => { if (!frame && desktop.matches && !reduced.matches && !paused) frame = requestAnimationFrame(paint); };
    const setup = () => {
      observer?.disconnect(); cancelAnimationFrame(frame); frame = 0;
      removeEventListener("scroll", request);
      const cards = [...root.querySelectorAll("[data-story-card]")];
      cards.forEach(card => { delete card.dataset.mobileMotion; delete card.dataset.mobileVisible; });
      if (!desktop.matches || reduced.matches || paused) {
        root.dataset.static = "true";
        root.style.setProperty("--travel", 0); root.style.setProperty("--ink", "100%");
        cards.forEach(card => card.style.setProperty("--reveal", 1));
        if (!reduced.matches && !paused) {
          cards.forEach((card, index) => {
            card.dataset.mobileMotion = "true";
            card.style.setProperty("--phone-delay", `${index % 2 * 60}ms`);
          });
          observer = new IntersectionObserver(entries => entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting) { target.dataset.mobileVisible = "true"; observer.unobserve(target); }
          }), { threshold: .12 });
          cards.forEach(card => observer.observe(card));
        }
        return;
      }
      paint();
      addEventListener("scroll", request, { passive: true });
    };
    setup();
    addEventListener("resize", request);
    reduced.addEventListener("change", setup);
    desktop.addEventListener("change", setup);
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); removeEventListener("scroll", request); removeEventListener("resize", request); reduced.removeEventListener("change", setup); desktop.removeEventListener("change", setup); };
  }, [ref, paused]);
}

export function ProcessStory({ paused }) {
  const root = useRef(null);
  useStoryMotion(root, paused);
  return <section id="process" className={s.process} ref={root} aria-labelledby="process-title">
    <div className={s.processIntro}>
      <p className={s.eyebrow}>OUR PROCESS</p>
      <h2 id="process-title" className={s.heading}>From first idea<br />to final launch.</h2>
      <p className={s.introCopy}>A clear direction. A considered design.<br />Every step moves your business forward.</p>
      <a href="#process-steps" className={s.explore}>Explore the process</a>
    </div>
    <ol className={s.steps} id="process-steps">
      {steps.map(([name, copy, detail, path], i) => <li className={s.step} data-story-card key={name} style={{ "--speed": [0.75, 1.3, .95, 1.6][i] }}>
        <div className={s.stepIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d={path} /></svg></div>
        <div className={s.stepBody}><h3>{name}</h3><p>{copy}</p><span className={s.detail}>{detail}</span></div>
      </li>)}
    </ol>
  </section>;
}

export function FaqStory({ paused, items = questions, contactHref = "/contact", contactLabel = "Contact Us" }) {
  const root = useRef(null);
  useStoryMotion(root, paused);
  return <section id="faq" className={s.faq} ref={root} aria-labelledby="faq-title" data-site-faq>
    <div className={s.faqIntro}>
      <p className={s.eyebrow}>FAQ</p>
      <h2 id="faq-title" className={s.heading}>Good questions.<br />Clear answers.</h2>
      <p className={s.introCopy}>A little clarity before your next big move.</p>
      <Link href={contactHref} className={s.contact}>{contactLabel}</Link>
      <div className={s.questionArt} aria-hidden="true"><span>?</span><i /></div>
    </div>
    <ol className={s.answers}>
      {items.map(([question, answer]) => <li className={s.answer} key={question} data-story-card>
        <span className={s.marker} aria-hidden="true">?</span>
        <article className={s.bubble}><h3>{question}</h3><p>{answer}</p></article>
      </li>)}
    </ol>
  </section>;
}
