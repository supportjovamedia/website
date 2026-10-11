"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import ConsultationLink from "./ConsultationLink";
import Footer from "./Footer";
import DaybreakHero from "./DaybreakHero";
import GrowthSignup from "./GrowthSignup";
import WhyJovaPreview from "./WhyJovaPreview";
import { ProcessStory, FaqStory } from "./ScrollStories";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import s from "./StudioHome.module.css";
import MotionRegion from "./MotionRegion";

const rows = [
  [["qaiser-watches", "Qaiser Watches"], ["monolith", "Monolith"], ["elise", "Elise"], ["stem-club", "Stem Club"], ["sumera-current", "Sumera’s"], ["tamarind", "Tamarind"], ["bare-form", "Bare Form"], ["margin", "Margin"]],
  [["casa-lenta", "Casa Lenta"], ["al-eiman", "Al Eiman"], ["fern-stone", "Fern & Stone"], ["nera", "Nera"], ["reform", "Reform"], ["sable", "Sable"], ["alma", "Alma"]],
];
const services = [
  { name: "Website Design", image: "websites", alt: "Fern & Field garden website design displayed on a graphite MacBook", caption: "Fern & Field · Website design concept", intro: "A great first impression. A clear next step.", copy: "A website that feels like your business and makes it easy for the right people to get in touch.", points: ["Designed around your business", "Thoughtful on every screen", "Your feedback at each stage", "A clear path to enquiry"], href: "/services/web-design" },
  { name: "Social Media Marketing", image: "marketing", alt: "Bun & Butter social campaign with bakery posts and a smartphone", caption: "Bun & Butter · Social campaign concept", intro: "Good design. Out in the world.", copy: "Bring your message to the places your customers spend time, with content that gives them a reason to take the next step.", points: ["Social content with a clear purpose", "Campaign and landing page design", "Consistent creative", "Measurement that helps you improve"], href: "/services/social-management" },
  { name: "Brand Strategy & Design", image: "branding", alt: "Bun & Butter bakery brand with a B monogram, packaging and coffee cups", caption: "Bun & Butter · Brand design concept", intro: "A brand people remember.", copy: "From the first sketch to the finishing touches, give your business a look that feels consistent and recognisable.", points: ["Logo and visual identity", "Colours and typography", "Files for print and digital", "A consistent look across your brand"], href: "/services/brand-strategy" },
];
export default function StudioHome() {
  const gallery = useRef(null);
  const story = useRef(null);
  const panels = useRef([]);
  const [chapter, setChapter] = useState(0);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 901px) and (min-height: 820px) and (hover: hover) and (pointer: fine)");
    let frame = 0;
    let lastChapter = -1;
    const paint = () => {
      frame = 0;
      setPinned(desktop.matches && !media.matches);
      if (media.matches || !desktop.matches) {
        gallery.current.style.setProperty("--gallery-pan", "0px");
        return;
      }
      const rect = gallery.current.getBoundingClientRect();
      gallery.current.style.setProperty("--gallery-pan", `${Math.max(-220, Math.min(220, -rect.top * .12))}px`);
      const stage = story.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -stage.top / Math.max(1, stage.height - innerHeight)));
      const next = Math.min(2, Math.floor(progress * 3));
      if (next !== lastChapter) { lastChapter = next; setChapter(next); }
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const setup = () => {
      removeEventListener("scroll", request);
      if (desktop.matches && !media.matches) addEventListener("scroll", request, { passive: true });
      request();
    };
    addEventListener("resize", request);
    media.addEventListener("change", setup);
    desktop.addEventListener("change", setup);
    setup();
    return () => { cancelAnimationFrame(frame); removeEventListener("scroll", request); removeEventListener("resize", request); media.removeEventListener("change", setup); desktop.removeEventListener("change", setup); };
  }, []);
  function jump(index) {
    const media = matchMedia("(min-width: 901px) and (min-height: 820px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (media.matches) {
      const top = story.current.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + (story.current.offsetHeight - innerHeight) * (index + .15) / 3, behavior: "instant" });
    } else { setChapter(index); panels.current[index]?.scrollIntoView({ behavior: "instant", block: "start" }); }
    trackEvent("select_content", { destination: services[index].href });
  }
  return <div className={s.home}>
    <main>
      <DaybreakHero />
      <section className={s.gallery} ref={gallery} aria-label="Website design previews">
        {rows.map((row, index) => <div key={index} className={s.galleryWindow} data-direction={index % 2 ? "right" : "left"}>
          <div className={s.pan}><div className={s.track}>{[...row, ...row].map(([image, name], item) => <figure key={`${image}-${item}`} className={s.preview} aria-hidden={item >= row.length ? "true" : undefined}>
            <div className={s.browserBar}><span aria-hidden="true">● ● ●</span><span>{name}</span></div>
            <Image src={`/studio-2026/${image}.webp`} alt={item >= row.length ? "" : `${name} website preview`} width={1672} height={941} sizes="(max-width: 600px) 70vw, 30vw" draggable={false} />
          </figure>)}</div></div>
        </div>)}
      </section>
      <section className={s.benefits} aria-labelledby="benefits-title">
        <div className={s.sectionIntro} data-site-reveal><p className={s.kicker}>LESS COMPLICATED. MORE CONSIDERED.</p><h2 id="benefits-title">Good design.<br />Built for your business.</h2><p>You bring the ambition. We help turn it into a website, a brand and a clear way forward.</p></div>
        <MotionRegion className={s.benefitGrid}>
          <article data-motion-card><Image className={s.benefitPhoto} src="/home-agency/sketch.webp" alt="Design sketches and ideas" width={800} height={600} sizes="(max-width:600px) 100vw, 30vw" /><h3>Made around you.</h3><p>Your goals, your customers and your personality shape the work. We start with your business.</p></article>
          <article data-motion-card><Image className={s.benefitPhoto} src="/home-agency/desk.webp" alt="A workspace for planning and collaboration" width={800} height={600} sizes="(max-width:600px) 100vw, 30vw" /><h3>Clear at every stage.</h3><p>Review the design, ask questions and share feedback. You know what is happening and what comes next.</p></article>
          <article data-motion-card><Image className={s.benefitPhoto} src="/home-agency/objects.webp" alt="Carefully considered studio materials" width={800} height={600} sizes="(max-width:600px) 100vw, 30vw" /><h3>Built with purpose.</h3><p>A good-looking website should help people understand your offer and feel ready to get in touch.</p></article>
        </MotionRegion>
      </section>
      <section className={s.story} data-chapter={chapter} data-pinned={pinned} ref={story} aria-labelledby="services-title">
        <div className={s.sticky}>
          <div className={s.storyHeading}><p className={s.kicker}>THE RIGHT TOOLS FOR YOUR NEXT CHAPTER</p><h2 id="services-title">A little more than a website.</h2></div>
          <nav className={s.chapters} aria-label="Explore services">{services.map((service, index) => <button key={service.name} type="button" aria-current={chapter === index ? "step" : undefined} onClick={() => jump(index)}>{service.name}</button>)}</nav>
          <MotionRegion className={s.stage}>{services.map((service, index) => <article key={service.name} ref={element => { panels.current[index] = element; }} className={s.service} data-active={chapter === index} inert={pinned && chapter !== index ? true : undefined}>
            <figure className={s.serviceVisual} data-motion-card><Image src={`/studio-2026/${service.image}.webp`} alt={service.alt} width={1448} height={1086} sizes="(max-width: 900px) 100vw, 58vw" /></figure>
            <div className={s.serviceCopy}><h3>{service.name}.</h3><h4>{service.intro}</h4><p>{service.copy}</p><ul>{service.points.map(point => <li key={point}><Check size={17} aria-hidden="true" />{point}</li>)}</ul><div className={s.serviceActions}><ConsultationLink className={s.primary} placement="home_intro">Free consultation</ConsultationLink><Link href={service.href} className={s.underlined}>Learn more</Link></div></div>
          </article>)}</MotionRegion>
          <div className={s.moreServices}><Link href="/services" className={s.secondary}>View more services</Link></div>
        </div>
      </section>
      <ProcessStory />
      <WhyJovaPreview />
      <section className={s.experience} aria-labelledby="experience-title"><div data-site-reveal><p className={s.kicker}>EXPERIENCE YOU CAN BUILD ON</p><h2 id="experience-title">Big ideas.<br />A personal approach.</h2><Link href="/about" className={s.underlined}>Get to know JovaMedia</Link></div><div className={s.stats}><article><strong>2016</strong><h3>Where it began.</h3><p>Designing websites and helping businesses bring their ideas to life.</p></article></div></section>
      <FaqStory />
      <section className={s.finalCta} data-site-reveal aria-labelledby="final-cta-title"><p>YOUR NEXT CHAPTER STARTS WITH A CONVERSATION.</p><h2 id="final-cta-title">Let’s make your<br />first impression count.</h2><div className={s.actions}><ConsultationLink className={s.lightButton} placement="other">Get my free consultation</ConsultationLink><Link href="/pricing" className={s.darkOutline}>View pricing</Link></div></section>
    </main>
    <div className="jova-pages"><GrowthSignup newsletter /><Footer /></div>
  </div>;
}
