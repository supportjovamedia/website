"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import ConsultationLink from "./ConsultationLink";
import Footer from "./Footer";
import DaybreakHero from "./DaybreakHero";
import GrowthSignup from "./GrowthSignup";
import WhyJovaPreview from "./WhyJovaPreview";
import ProjectAndGuides from "./ProjectAndGuides";
import { ProcessStory, FaqStory } from "./ScrollStories";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import s from "./StudioHome.module.css";
import useCardRail from "./useCardRail";
import RailPagination from "./RailPagination";
import MotionRegion from "./MotionRegion";

const designs = [["qaiser-watches", "Qaiser Watches"], ["monolith", "Monolith"], ["elise", "Elise"], ["stem-club", "Stem Club"], ["sumera-current", "Sumera’s"], ["tamarind", "Tamarind"]];
const services = [
  { name: "Website Design", image: "websites", alt: "Fern & Field garden website design displayed on a graphite MacBook", caption: "Fern & Field · Website design concept", intro: "A great first impression. A clear next step.", copy: "A website that feels like your business and makes it easy for the right people to get in touch.", points: ["Designed around your business", "Thoughtful on every screen", "Your feedback at each stage", "A clear path to enquiry"], href: "/websites" },
  { name: "Social Media Marketing", image: "marketing", alt: "Bun & Butter social campaign with bakery posts and a smartphone", caption: "Bun & Butter · Social campaign concept", intro: "Good design. Out in the world.", copy: "Bring your message to the places your customers spend time, with content that gives them a reason to take the next step.", points: ["Social content with a clear purpose", "Campaign and landing page design", "Consistent creative", "Measurement that helps you improve"], href: "/services/social-management" },
  { name: "Brand Strategy & Design", image: "branding", alt: "Bun & Butter bakery brand with a B monogram, packaging and coffee cups", caption: "Bun & Butter · Brand design concept", intro: "A brand people remember.", copy: "From the first sketch to the finishing touches, give your business a look that feels consistent and recognisable.", points: ["Logo and visual identity", "Colours and typography", "Files for print and digital", "A consistent look across your brand"], href: "/services/brand-strategy" },
];
const desktopStoryQuery = "(min-width: 901px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)";
function subscribeDesktopStory(callback) {
  const query = matchMedia(desktopStoryQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function desktopStorySnapshot() { return matchMedia(desktopStoryQuery).matches; }
export default function StudioHome() {
  const { rail: benefitRail, registerCard: registerBenefit, active: benefitActive, select: selectBenefit } = useCardRail();
  const gallery = useRef(null);
  const story = useRef(null);
  const { rail: serviceRail, registerCard: registerService, active: mobileChapter, select: selectService } = useCardRail();
  const [desktopChapter, setDesktopChapter] = useState(0);
  const pinned = useSyncExternalStore(subscribeDesktopStory, desktopStorySnapshot, () => false);
  const chapter = pinned ? desktopChapter : mobileChapter;
  useEffect(() => {
    if (!pinned) return;
    const element = story.current;
    let frame = 0, offset = 86, lastChapter = -1;
    const paint = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (offset - rect.top) / Math.max(1, rect.height - (innerHeight - offset))));
      const next = Math.min(2, Math.floor(progress * 3));
      if (next !== lastChapter) { lastChapter = next; setDesktopChapter(next); }
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const measure = () => {
      offset = document.querySelector(".header")?.offsetHeight || 86;
      element.style.setProperty("--story-top", `${offset}px`);
      request();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", measure);
    measure();
    return () => { resize.disconnect(); cancelAnimationFrame(frame); removeEventListener("scroll", request); removeEventListener("resize", measure); };
  }, [pinned]);
  useEffect(() => {
    const element = gallery.current;
    const visibility = new IntersectionObserver(entries => {
      element.dataset.inView = String(entries[0].isIntersecting);
    });
    visibility.observe(element);
    return () => visibility.disconnect();
  }, []);
  function jump(index) {
    if (pinned) {
      const element = story.current;
      const offset = parseFloat(getComputedStyle(element).getPropertyValue("--story-top")) || 86;
      scrollTo({ top: element.getBoundingClientRect().top + scrollY - offset + (element.offsetHeight - (innerHeight - offset)) * (index + .15) / 3, behavior: "instant" });
    } else if (matchMedia("(min-width:901px)").matches) {
      document.getElementById(`home-service-${services[index].image}`)?.scrollIntoView({ behavior: "instant", block: "center" });
    } else selectService(index);
    trackEvent("select_content", { destination: services[index].href });
  }
  return <div className={s.home}>
    <main>
      <DaybreakHero />
      <section className={s.gallery} ref={gallery} aria-label="Website design previews">
        <div className={s.galleryWindow}>
          <div className={s.track}>{[...designs, ...designs].map(([image, name], item) => <figure key={`${image}-${item}`} className={s.preview} aria-hidden={item >= designs.length ? "true" : undefined}>
            <Image src={`/studio-2026/${image}.webp`} alt={item >= designs.length ? "" : `${name} website preview`} width={1672} height={941} sizes="(max-width: 600px) 72vw, 30vw" draggable={false} fetchPriority="low" />
          </figure>)}</div>
        </div>
      </section>
      <section className={s.benefits} aria-labelledby="benefits-title">
        <div className={s.sectionIntro} data-site-reveal><h2 id="benefits-title">Small business websites.<br />Built around you.</h2><p>Make your services easy to understand, show your work and give customers a clear way to enquire or book. We design and build websites for small businesses across the UK.</p></div>
        <div className={s.benefitGrid} ref={benefitRail} tabIndex={0} role="region" aria-label="Small business website benefits">
          <article id="benefit-design" data-active={benefitActive === 0} ref={node => registerBenefit(0, node)}><Image className={s.benefitPhoto} src="/home-agency/sketch.webp" alt="Design sketches and ideas" width={800} height={600} sizes="(max-width:900px) 85vw, 30vw" /><h3>Custom website design.</h3><p>Your services, customers and brand shape the layout and copy. Get a new business website or redesign an existing one around what you need.</p><Link className={s.underlined} href="/websites">Explore website design</Link></article>
          <article id="benefit-pricing" data-active={benefitActive === 1} ref={node => registerBenefit(1, node)}><Image className={s.benefitPhoto} src="/home-agency/desk.webp" alt="A workspace for planning and collaboration" width={800} height={600} sizes="(max-width:900px) 85vw, 30vw" /><h3>Clear scope and pricing.</h3><p>Business websites start from £550, with custom booking websites from £2,000. Review the design and agree the pages, features and running costs before the build.</p><Link className={s.underlined} href="/pricing">Compare website packages</Link></article>
          <article id="benefit-customers" data-active={benefitActive === 2} ref={node => registerBenefit(2, node)}><Image className={s.benefitPhoto} src="/home-agency/objects.webp" alt="Carefully considered studio materials" width={800} height={600} sizes="(max-width:900px) 85vw, 30vw" /><h3>Ready for customers.</h3><p>Responsive pages, clear contact options and search foundations help people find their way. Add your existing booking app or agree a custom booking system.</p><Link className={s.underlined} href="/websites/salon-website-design">Explore salon and booking websites</Link></article>
        </div>
        <RailPagination className={s.benefitPagination} label="Choose a website benefit" items={[{ id: "benefit-design", name: "Custom website design" }, { id: "benefit-pricing", name: "Clear scope and pricing" }, { id: "benefit-customers", name: "Ready for customers" }]} active={benefitActive} onSelect={selectBenefit}/>
      </section>
      <section className={s.story} ref={story} data-chapter={chapter} data-pinned={pinned} data-service-story aria-labelledby="services-title">
        <div className={s.sticky}>
          <div className={s.storyHeading}><h2 id="services-title">A little more than a website.</h2></div>
          <nav className={s.chapters} aria-label="Explore services">{services.map((service, index) => <button key={service.name} type="button" aria-label={service.name} aria-pressed={chapter === index} aria-controls={`home-service-${service.image}`} onClick={() => jump(index)}><span className={s.fullServiceName}>{service.name}</span><span className={s.shortServiceName}>{["Websites", "Social media", "Branding"][index]}</span></button>)}</nav>
          <div className={s.stage} ref={serviceRail} tabIndex={0} role="region" aria-label="Service previews">{services.map((service, index) => <article key={service.name} id={`home-service-${service.image}`} ref={element => registerService(index, element)} className={s.service} data-active={chapter === index} inert={pinned && chapter !== index ? true : undefined}>
            <figure className={s.serviceVisual}><Image src={`/studio-2026/${service.image}.webp`} alt={service.alt} width={1448} height={1086} sizes="(max-width: 900px) 90vw, 960px" />{index > 0 && <button className={`${s.serviceArrow} ${s.previousService}`} type="button" aria-label="Previous service" onClick={() => jump(index - 1)}><ChevronLeft size={22} aria-hidden="true" /></button>}{index < services.length - 1 && <button className={`${s.serviceArrow} ${s.nextService}`} type="button" aria-label="Next service" onClick={() => jump(index + 1)}><ChevronRight size={22} aria-hidden="true" /></button>}</figure>
            <div className={s.serviceCopy}><h3>{service.name}.</h3><h4>{service.intro}</h4><p>{service.copy}</p><ul>{service.points.map(point => <li key={point}><Check size={17} aria-hidden="true" />{point}</li>)}</ul><div className={s.serviceActions}><ConsultationLink className={s.primary} placement="home_intro">Free consultation</ConsultationLink><Link href={service.href} className={s.underlined}>{["Website design details", "Social media management", "Brand strategy and design"][index]}</Link></div></div>
          </article>)}</div>
          <div className={s.moreServices}><Link href="/services" className={s.secondary}>View more services</Link></div>
        </div>
      </section>
      <ProcessStory />
      <WhyJovaPreview />
      <ProjectAndGuides />
      <section className={s.experience} aria-labelledby="experience-title"><MotionRegion className={s.experienceInner} enterOnly><div data-motion-card><h2 id="experience-title">Big ideas.<br />A personal approach.</h2><p>Designing websites and helping businesses bring their ideas to life since 2016.</p><Link href="/about" className={s.underlined}>Get to know JovaMedia</Link></div><figure className={s.experienceImage} data-motion-card><Image src="/studio-2026/sable.webp" alt="Sable hair salon website design concept with the heading A good hair day, made yours" width={1672} height={941} sizes="(max-width:750px) 90vw, 560px"/></figure></MotionRegion></section>
      <FaqStory />
      <section className={s.finalCta} data-site-reveal aria-labelledby="final-cta-title"><h2 id="final-cta-title">Let’s make your<br />first impression count.</h2><div className={s.actions}><ConsultationLink className={s.lightButton} placement="other">Get my free consultation</ConsultationLink><Link href="/pricing" className={s.darkOutline}>View pricing</Link></div></section>
    </main>
    <div className="jova-pages"><GrowthSignup newsletter /><Footer /></div>
  </div>;
}
