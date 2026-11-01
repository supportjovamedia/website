"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import s from "./ScrollStories.module.css";
import MotionRegion from "./MotionRegion";

const steps = [
  ["Discover", "We agree your website pages, features and budget, and what customers should do when they visit.", "A written scope and clear costs", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4 5-2 6-6 2 2-6 6-2Z"],
  ["Design", "Review a custom website design shaped around your brand, services and customer journey.", "Your feedback before the build", "m5 16-1 4 4-1L20 7l-3-3L5 16Zm9-9 3 3"],
  ["Develop", "We build responsive pages, connect the agreed enquiry or booking tools, and test how everything works.", "Checked on phone and desktop", "m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"],
  ["Launch", "We check forms, page titles and redirects, publish the approved website and arrange your handover.", "Ownership and support explained", "M14 4c3-2 6-2 6-2s0 3-2 6l-6 6-5-5 7-5ZM7 9H3l-1 5 6-1m4 1-1 6 5-1v-4M5 17l-3 5 5-3"],
];
const questions = [
  ["Do you work with businesses outside London?", "Yes. JovaMedia is based in London and works with small businesses across the UK. We can plan, review and deliver your website remotely, with clear communication throughout."],
  ["How much does a small business website cost?", "Our landing pages start from £350, four-page business websites from £550 and websites with a custom booking system from £2,000. The final quote depends on the pages and functionality you need. Domain, hosting and other running costs are explained separately."],
  ["What is included in the free homepage preview?", "Tell us about your business, share any existing website or social profile and explain what you want customers to do. We will show a personalised homepage direction within 48 hours, before you commit to a project. The preview offer is available through 31 December 2026."],
  ["Can you redesign my existing website?", "Yes. We start by understanding your goals and reviewing your current site, then agree what to keep, improve or rebuild."],
  ["Can my website use my existing booking app?", "Yes. We can agree a link or supported integration with the booking service you already use. A custom booking panel is a separate scope, which we recommend when it solves a specific requirement."],
  ["Will my website be ready for Google search?", "We build the agreed search foundations, including descriptive titles, clear headings, relevant links, mobile layouts and appropriate structured data. Google decides whether and where a page appears. We review the results after publication instead of guaranteeing a position."],
  ["Will I own my website?", "Our website packages include full website and source-code ownership. We confirm domain access, hosting arrangements, third-party licences and handover responsibilities in the written scope."],
  ["How does a project get started?", "Tell us about your business and what you want to achieve. We will discuss priorities, scope and a practical plan before work begins."],
  ["Can you support us after launch?", "Yes. Website care, content and ongoing support can be agreed around what your business needs."],
];

// One event-driven frame per scroll. Content remains readable without motion or JS.
function useStoryMotion(ref, paused, hasProgressTrack = false) {
  useEffect(() => {
    const root = ref.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine)");
    let frame = 0, observer;
    const paint = () => {
      frame = 0;
      const staticMode = paused || reduced.matches || !desktop.matches;
      const rect = root.getBoundingClientRect();
      // One section measurement is enough to skip distant content. Keep scroll
      // updates independent of observer timing when opening an anchor directly.
      if (rect.bottom < -250 || rect.top > innerHeight + 250) return;
      const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
      const cards = [...root.querySelectorAll("[data-story-card]")];
      // Read all geometry before changing styles, rather than forcing layout
      // again for each card and marker.
      const positions = cards.map(card => ({
        box: card.getBoundingClientRect(),
        markerBox: card.querySelector("[data-story-marker]")?.getBoundingClientRect(),
      }));
      const track = hasProgressTrack && root.querySelector("[data-story-track]");
      const markers = hasProgressTrack ? [...root.querySelectorAll("[data-story-marker]")] : [];
      const trackBox = track && markers.length > 1 ? track.getBoundingClientRect() : null;
      const first = trackBox && markers[0].getBoundingClientRect();
      const last = trackBox && markers[markers.length - 1].getBoundingClientRect();
      if (root.id === "process") root.style.setProperty("--process-progress", reduced.matches ? 1 : Math.max(0, Math.min(1, (innerHeight * .8 - rect.top) / Math.max(1, rect.height * .8))));
      root.style.setProperty("--travel", staticMode ? 0 : (0.5 - progress) * 300);
      root.style.setProperty("--ink", `${staticMode ? 100 : Math.max(0, Math.min(100, (innerHeight * .9 - rect.top) / (innerHeight * .5) * 100))}%`);
      let nearest = 0, distance = Infinity;
      cards.forEach((card, i) => {
        const { box, markerBox } = positions[i];
        const centre = markerBox ? markerBox.top + markerBox.height / 2 : box.top + box.height / 2;
        const d = Math.abs(centre - innerHeight * .48);
        if (d < distance) { distance = d; nearest = i; }
        const reveal = Math.max(0, Math.min(1, (innerHeight * .95 - box.top) / (innerHeight * .35)));
        card.style.setProperty("--reveal", staticMode ? 1 : reveal);
      });
      cards.forEach((card, i) => { card.dataset.current = String(i === nearest); });
      if (trackBox) {
        const start = first.top + first.height / 2;
        const length = last.top + last.height / 2 - start;
        root.style.setProperty("--line-start", `${start - trackBox.top}px`);
        root.style.setProperty("--line-length", `${Math.max(0, length)}px`);
        root.style.setProperty("--line", paused ? 1 : Math.max(0, Math.min(1, (innerHeight * .48 - start) / Math.max(1, length))));
      }
    };
    const request = () => { if (!frame && !paused) frame = requestAnimationFrame(paint); };
    const setup = () => {
      observer?.disconnect(); cancelAnimationFrame(frame); frame = 0;
      removeEventListener("scroll", request);
      const cards = [...root.querySelectorAll("[data-story-card]")];
      cards.forEach(card => { delete card.dataset.mobileMotion; delete card.dataset.mobileVisible; });
      root.dataset.static = String(paused || reduced.matches || !desktop.matches);
      paint();
      if (!paused) addEventListener("scroll", request, { passive: true });
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
    };
    setup();
    // Opening an answer changes the positions below it, even without scrolling.
    const sizeObserver = new ResizeObserver(request);
    sizeObserver.observe(root);
    addEventListener("resize", request);
    reduced.addEventListener("change", setup);
    desktop.addEventListener("change", setup);
    return () => { observer?.disconnect(); sizeObserver.disconnect(); cancelAnimationFrame(frame); removeEventListener("scroll", request); removeEventListener("resize", request); reduced.removeEventListener("change", setup); desktop.removeEventListener("change", setup); };
  }, [ref, paused, hasProgressTrack]);
}

export function ProcessStory({ paused }) {
  const root = useRef(null);
  useStoryMotion(root, paused);
  return <section id="process" className={s.process} ref={root} aria-labelledby="process-title">
    <MotionRegion className={s.processIntro} enterOnly><div data-motion-card>
      <h2 id="process-title" className={s.heading}>From first idea<br />to final launch.</h2>
      <p className={s.introCopy}>A practical website design process, with clear review points from the first brief to launch.</p>
      <a href="#process-steps" className={s.explore}>Explore the process</a>
    </div></MotionRegion>
    <div className={s.processProgress} aria-hidden="true"><span/></div>
    <ol className={s.steps} id="process-steps">
      {steps.map(([name, copy, detail, path], i) => <li className={s.step} data-story-card key={name} style={{ "--speed": [0.75, 1.3, .95, 1.6][i] }}>
        <div className={s.stepIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d={path} /></svg></div>
        <div className={s.stepBody}><h3>{name}</h3><p>{copy}</p><span className={s.detail}>{detail}</span></div>
      </li>)}
    </ol>
  </section>;
}

export function FaqStory({ paused, items = questions, contactHref = "/contact", contactLabel = "Contact Us", introduction = "About your website, the scope and what happens next.", showArtwork = true }) {
  const root = useRef(null);
  useStoryMotion(root, paused, true);
  return <section id="faq" className={s.faq} ref={root} aria-labelledby="faq-title" data-site-faq>
    <div className={s.faqIntro}>

      <h2 id="faq-title" className={s.heading}>Good questions.<br />Clear answers.</h2>
      <p className={s.introCopy}>{introduction}</p>
      <Link href={contactHref} className={s.contact}>{contactLabel}</Link>
      {showArtwork && <div className={s.questionArt} aria-hidden="true"><span>?</span><i /></div>}
    </div>
    <ol className={s.answers} data-story-track>
      {items.map(([question, answer]) => <li className={s.answer} key={question} data-story-card>
        <span className={s.marker} data-story-marker aria-hidden="true">?</span>
        <details className={s.bubble}><summary><h3>{question}</h3></summary><div className={s.answerContent}><p>{answer}</p></div></details>
      </li>)}
    </ol>
  </section>;
}
