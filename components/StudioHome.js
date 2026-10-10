"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Pause, Play, Asterisk, CircleDot } from "lucide-react";
import ConsultationLink from "./ConsultationLink";
import Footer from "./Footer";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import s from "./StudioHome.module.css";

const rows = [
  [["kova", "Kova", "Design concept"], ["sumera-current", "Sumera’s", "Website preview"], ["dolce", "Dolce", "Design concept"], ["nexo", "Nexo", "Design concept"]],
  [["qaiser-watches", "Qaiser Watches", "Website preview"], ["nera", "Nera", "Design concept"], ["blush-house", "Blush House", "Design concept"], ["knitly", "Knitly", "Design concept"]],
  [["dolce", "Dolce", "Design concept"], ["al-eiman", "Al Eiman", "Website preview"], ["kova", "Kova", "Design concept"], ["nera", "Nera", "Design concept"]],
];
const services = [
  { name: "Websites", image: "websites", alt: "Fern & Field garden website design concept displayed on a graphite MacBook", caption: "Fern & Field · Website design concept", intro: "A great first impression. A clear next step.", copy: "A website that feels like your business and makes it easy for the right people to get in touch.", points: ["Designed around your business", "Thoughtful on every screen", "Your feedback at each stage", "A clear path to enquiry"], href: "/services/web-design" },
  { name: "Logos", image: "branding", alt: "Bun & Butter bakery brand concept with a B monogram, packaging and coffee cups", caption: "Bun & Butter · Brand design concept", intro: "A brand people remember.", copy: "From the first sketch to the finishing touches, give your business a look that feels consistent and recognisable.", points: ["Logo and visual identity", "Colours and typography", "Files for print and digital", "A consistent look across your brand"], href: "/services/brand-strategy" },
  { name: "Marketing", image: "marketing", alt: "Bun & Butter social campaign concept with bakery posts and a smartphone", caption: "Bun & Butter · Social campaign concept", intro: "Good design. Out in the world.", copy: "Bring your message to the places your customers spend time, with content that gives them a reason to take the next step.", points: ["Social content with a clear purpose", "Campaign and landing page design", "Consistent creative", "Measurement that helps you improve"], href: "/services/social-management" },
];
const questions = [
  ["What happens in the free consultation?", "We talk about your business, what you need your website to do and what could be improved. You get practical advice and a suggested next step, with no obligation to buy."],
  ["Can you work on my existing website?", "Yes. Tell us what you have and what needs to change. We will look at whether improving the current site or starting again makes more sense."],
  ["Will I get to review the design?", "Yes. We agree the brief and give you opportunities to review the work and provide feedback. Your proposal sets out the stages and revision allowance."],
  ["What does a website package include?", "The Pricing page sets out the starting scope for each package. Hosting, domains and paid software are separate. We confirm your requirements, timescale and final price before accepting an order."],
];

export default function StudioHome() {
  const gallery = useRef(null);
  const story = useRef(null);
  const panels = useRef([]);
  const [paused, setPaused] = useState(false);
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastChapter = -1;
    const paint = () => {
      frame = 0;
      const rect = gallery.current.getBoundingClientRect();
      gallery.current.style.setProperty("--gallery-pan", `${media.matches || paused ? 0 : Math.max(-220, Math.min(220, -rect.top * .12))}px`);
      const stage = story.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -stage.top / Math.max(1, stage.height - innerHeight)));
      const next = Math.min(2, Math.floor(progress * 3));
      if (next !== lastChapter) { lastChapter = next; setChapter(next); }
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(paint); };
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", request);
    media.addEventListener("change", request);
    paint();
    return () => { cancelAnimationFrame(frame); removeEventListener("scroll", request); removeEventListener("resize", request); media.removeEventListener("change", request); };
  }, [paused]);
  function jump(index) {
    const media = matchMedia("(min-width: 901px) and (prefers-reduced-motion: no-preference)");
    if (media.matches) {
      const top = story.current.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + (story.current.offsetHeight - innerHeight) * (index + .15) / 3, behavior: "instant" });
    } else panels.current[index]?.scrollIntoView({ behavior: "instant", block: "start" });
    trackEvent("select_content", { destination: services[index].href });
  }
  return <div className={s.home}>
    <main>
      <section className={s.hero} aria-labelledby="home-title">
        <p className={s.kicker}>WEBSITES. BRANDS. GOOD CONVERSATIONS.</p>
        <h1 id="home-title">Your next great website<br />starts here.</h1>
        <p className={s.intro}>Thoughtful design. Clear advice.<br className={s.mobileBreak} /> A website built around your business.</p>
        <div className={s.actions}><ConsultationLink className={s.primary} placement="hero">Get my free website consultation <ArrowUpRight size={19} aria-hidden="true" /></ConsultationLink><Link className={s.secondary} href="/pricing">View pricing</Link></div>
        <p className={s.reassurance}>A friendly conversation. Practical advice. No obligation.</p>
      </section>
      <section className={s.gallery} ref={gallery} data-paused={paused} aria-label="Website design previews">
        {rows.map((row, index) => <div key={index} className={s.galleryWindow} data-direction={index % 2 ? "right" : "left"}>
          <div className={s.pan}><div className={s.track}>{[...row, ...row].map(([image, name, type], item) => <figure key={`${image}-${item}`} className={s.preview} aria-hidden={item >= row.length ? "true" : undefined}>
            <div className={s.browserBar}><span aria-hidden="true">● ● ●</span><span>{name}</span><span>{type}</span></div>
            <Image src={`/studio-2026/${image}.webp`} alt={item >= row.length ? "" : `${name} ${type.toLowerCase()}`} width={800} height={544} sizes="(max-width: 600px) 70vw, 30vw" priority={index === 0 && item < 4} draggable={false} />
          </figure>)}</div></div>
        </div>)}
        <div className={s.galleryNote}><p>Website previews and original design concepts.<br />A few different directions. Always built around the business.</p><button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{paused ? "Play motion" : "Pause motion"}</button></div>
      </section>
      <section className={s.benefits} aria-labelledby="benefits-title">
        <div className={s.sectionIntro}><p className={s.kicker}>LESS COMPLICATED. MORE CONSIDERED.</p><h2 id="benefits-title">Good design.<br />Built for your business.</h2><p>You bring the ambition. We help turn it into a website, a brand and a clear way forward.</p></div>
        <div className={s.benefitGrid}>
          <article><span className={s.symbol} aria-hidden="true"><ArrowUpRight size={38} strokeWidth={1.3} /></span><h3>Made around you.</h3><p>Your goals, your customers and your personality shape the work. We start with your business.</p></article>
          <article><span className={s.symbol} aria-hidden="true"><Asterisk size={38} strokeWidth={1.3} /></span><h3>Clear at every stage.</h3><p>Review the design, ask questions and share feedback. You know what is happening and what comes next.</p></article>
          <article><span className={s.symbol} aria-hidden="true"><CircleDot size={38} strokeWidth={1.3} /></span><h3>Built with purpose.</h3><p>A good-looking website should help people understand your offer and feel ready to get in touch.</p></article>
        </div>
      </section>
      <section className={s.story} ref={story} aria-labelledby="services-title">
        <div className={s.sticky}>
          <div className={s.storyHeading}><p className={s.kicker}>THE RIGHT TOOLS FOR YOUR NEXT CHAPTER</p><h2 id="services-title">A little more than a website.</h2></div>
          <nav className={s.chapters} aria-label="Explore services">{services.map((service, index) => <button key={service.name} type="button" aria-current={chapter === index ? "step" : undefined} onClick={() => jump(index)}>{service.name}<ArrowUpRight size={12} aria-hidden="true" /></button>)}</nav>
          <div className={s.stage}>{services.map((service, index) => <article key={service.name} ref={element => { panels.current[index] = element; }} className={s.service} data-active={chapter === index}>
            <figure className={s.serviceVisual}><Image src={`/studio-2026/${service.image}.webp`} alt={service.alt} width={1448} height={1086} sizes="(max-width: 900px) 100vw, 58vw" /><figcaption>{service.caption}</figcaption></figure>
            <div className={s.serviceCopy}><h3>{service.name}.</h3><h4>{service.intro}</h4><p>{service.copy}</p><ul>{service.points.map(point => <li key={point}><Check size={17} aria-hidden="true" />{point}</li>)}</ul><div className={s.serviceActions}><ConsultationLink className={s.primary} placement="home_intro">Free consultation <ArrowUpRight size={18} aria-hidden="true" /></ConsultationLink><Link href={service.href} className={s.underlined}>Learn more</Link></div>{index === 0 && <Link className={s.pricingLink} href="/pricing">Explore website pricing <ArrowUpRight size={16} aria-hidden="true" /></Link>}</div>
          </article>)}</div>
        </div>
      </section>
      <section className={s.experience} aria-labelledby="experience-title"><div><p className={s.kicker}>EXPERIENCE YOU CAN BUILD ON</p><h2 id="experience-title">Big ideas.<br />A personal approach.</h2><Link href="/about" className={s.underlined}>Get to know JovaMedia <ArrowUpRight size={17} aria-hidden="true" /></Link></div><div className={s.stats}><article><strong>500+</strong><h3>Websites built.</h3><p>Experience gained across our founder’s website projects.</p></article><article><strong>2011</strong><h3>Where it began.</h3><p>Years of turning ideas into thoughtful digital experiences.</p></article></div></section>
      <section className={s.faq} aria-labelledby="faq-title"><div><p className={s.kicker}>A FEW THINGS YOU MIGHT BE WONDERING</p><h2 id="faq-title">Good questions.<br />Straight answers.</h2><ConsultationLink className={s.underlined} placement="other">Ask us about your website <ArrowUpRight size={18} aria-hidden="true" /></ConsultationLink></div><div>{questions.map(([question, answer], index) => <details key={question}><summary><span className={s.questionRef}>QUESTION {String(index + 1).padStart(2, "0")}</span><span>{question}</span><span className={s.plus} aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <section className={s.finalCta} aria-labelledby="final-cta-title"><p>YOUR NEXT CHAPTER STARTS WITH A CONVERSATION.</p><h2 id="final-cta-title">Let’s make your<br />first impression count.</h2><div className={s.actions}><ConsultationLink className={s.lightButton} placement="other">Get my free consultation <ArrowUpRight size={19} aria-hidden="true" /></ConsultationLink><Link href="/pricing" className={s.darkOutline}>View pricing</Link></div></section>
    </main>
    <div className="jova-pages"><Footer /></div>
  </div>;
}
