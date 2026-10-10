"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import s from "./ServiceCardsPreview.module.css";

const services = [
  { title: ["Website", "Development"], slug: "web-design", photo: "/service-crafted/website-modern.webp", kind: "website" },
  { title: ["System", "Modernization"], slug: "system-modernization", photo: "/service-crafted/legacy-modern.webp", kind: "legacy" },
  { title: ["Social Media", "Management"], slug: "social-management", photo: "/service-crafted/social-picture.webp", kind: "social" },
  { title: ["Brand Strategy", "& Design"], slug: "brand-strategy", photo: "/service-crafted/branding-modern.webp", kind: "branding" },
  { title: ["Copywriting"], slug: "content", photo: "/service-crafted/copywriting-picture.webp", kind: "copywriting" },
  { title: ["Email Marketing", "& Automation"], slug: "email-marketing", photo: "/service-crafted/email-modern.webp", kind: "email" },
  { title: ["Content", "Production"], slug: "content-production", photo: "/service-crafted/camera-picture.webp", kind: "camera" },
  { title: ["Search &", "Local Visibility"], slug: "seo", photo: "/service-crafted/website-modern.webp", kind: "seo" },
];


const tags = [
  ["Web design", "Development"], ["Modernisation", "Integrations"], ["Content", "Community"],
  ["Strategy", "Identity"], ["Brand voice", "Website copy"],
  ["Campaigns", "Automation"], ["Photography", "Video"], ["Search", "Local visibility"]
];

export default function ServiceCardsPreview({ paused = false }) {
  const root = useRef(null);
  useEffect(() => {
    const section = root.current;
    const rows = [...section.querySelectorAll('[data-service-row]')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let observers = [];
    const setup = () => {
      observers.forEach(observer => observer.disconnect());
      observers = [];
      const staticMode = paused || reduced.matches;
      section.dataset.static = String(staticMode);
      // Observe stable row boxes, independently of the animated card inside.
      const positions = rows.map(row => row.getBoundingClientRect().top);
      for (const [state, boundary] of [['entered', .9], ['highlighted', .5]]) {
        const line = innerHeight * boundary;
        rows.forEach((row, index) => { row.dataset[state] = String(staticMode || positions[index] <= line); });
        if (staticMode) continue;
        const observer = new IntersectionObserver(entries => {
          const states = entries.map(entry => [entry.target, entry.boundingClientRect.top <= line]);
          states.forEach(([row, active]) => { row.dataset[state] = String(active); });
        }, { rootMargin: `0px 0px -${innerHeight - line}px 0px`, threshold: 0 });
        rows.forEach(row => observer.observe(row));
        observers.push(observer);
      }
    };
    setup();
    addEventListener('resize', setup);
    reduced.addEventListener('change', setup);
    return () => { observers.forEach(observer => observer.disconnect()); removeEventListener('resize', setup); reduced.removeEventListener('change', setup); };
  }, [paused]);
  return <section ref={root} className={s.section} id="services" aria-labelledby="services-heading">
    <div className={s.inner}>
      <header className={s.heading}>
        <div><p className={s.eyebrow}>OUR SERVICES</p>
        <h2 id="services-heading" className={s.title}>Everything you need<br />to <em>grow.</em></h2></div>
        <span className={s.headingNote}>Eight disciplines.<br />One connected approach.</span>
      </header>
      <div className={s.rows}>
        {services.map(({ title, slug, photo }, index) => <div className={s.row} data-service-row style={{'--tilt': index % 2 ? 12 : -12}} key={slug}>
          <Link className={s.card} href={`/services/${slug}`} aria-label={`Explore ${title.join(' ')}`}>
            <div className={s.visual} aria-hidden="true"><Image src={photo} alt="" fill sizes="(max-width:700px) 110px, 240px" /></div>
            <div className={s.content}><h3>{title.join(' ')}</h3><div className={s.tags}>{tags[index].map(tag => <span key={tag}>{tag}</span>)}</div></div>
            <span className={s.action} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.5" /></svg></span>
          </Link>
        </div>)}
      </div>
    </div>
  </section>;
}
