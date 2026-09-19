"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CookieConsent from "./CookieConsent";
import styles from "./StudioHome.module.css";

const projects = [
  { name: "Costa, reimagined", type: "Website & motion study", image: "costa", tone: "coffee", description: "Independent Costa Coffee website design on a MacBook", detail: "An independent design exploration for Costa Coffee. A bold digital storefront with product-led storytelling and scroll-driven motion. This is a self-initiated study, not commissioned client work." },
  { name: "Vellune", type: "Digital art direction", image: "vellune", tone: "fragrance", description: "Vellune fragrance website in warm ivory and amber on a MacBook", detail: "A self-initiated fragrance concept exploring a refined visual identity, expressive product imagery and a considered digital experience." },
  { name: "Stillleaf", type: "Website & brand exploration", image: "stillleaf", tone: "matcha", description: "Stillleaf matcha website in cream and green on a MacBook", detail: "A self-initiated matcha concept pairing a calm visual identity with product storytelling and considered movement." },
];
const services = [
  { name: "Websites & digital", summary: "From a focused landing page to a complete business website. We bring clear copy, considered design and responsive development together, so customers know who you are and what to do next.", tags: ["Web design", "Development", "SEO"], href: "/services/web-design", image: "costa", links: [["Website Development", "web-design"], ["Copywriting", "content"]] },
  { name: "Brand & direction", summary: "A recognisable identity and a consistent voice, wherever people meet your business. We help you find your difference and carry it through your brand and social presence.", tags: ["Strategy", "Identity", "Social"], href: "/services/brand-strategy", image: "vellune", links: [["Social Media", "social-management"], ["Brand Strategy & Design", "brand-strategy"]] },
  { name: "Content & connection", summary: "Give your audience a reason to keep coming back. From visual content to thoughtful email journeys, we help your business stay present, relevant and easy to remember.", tags: ["Content", "Email", "Automation"], href: "/services/content-production", image: "stillleaf", links: [["Email Marketing & Automation", "email-marketing"], ["Content Production", "content-production"]] },
];
function Mark() { return <span className={styles.mark} aria-hidden="true"><i /><i /><i /><i /></span>; }
function Arrow() { return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.5" /></svg>; }

export default function StudioHome() {
  const root = useRef(null);
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const trigger = useRef(null);
  const menuButton = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = root.current;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup = () => {};
    function setup() {
      cleanup();
      if (media.matches) return;
      const reveals = [...el.querySelectorAll("[data-reveal]")];
      const moving = [...el.querySelectorAll("[data-parallax]")];
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add(styles.visible); observer.unobserve(entry.target); }
      }), { threshold: .09 });
      reveals.forEach(item => {
        if (item.getBoundingClientRect().top > innerHeight * .95) { item.classList.add(styles.pending); observer.observe(item); }
      });
      let frame;
      function paint() {
        frame = null;
        const heroRect = el.querySelector("[data-hero]").getBoundingClientRect();
        el.style.setProperty("--hero-scroll", String(Math.min(1, Math.max(0, -heroRect.top / heroRect.height))));
        moving.forEach(item => {
          const rect = item.getBoundingClientRect();
          if (rect.bottom < -100 || rect.top > innerHeight + 100) return;
          const p = (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight;
          item.style.setProperty("--parallax", `${Math.max(-45, Math.min(45, p * Number(item.dataset.parallax)))}px`);
        });
      }
      const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
      addEventListener("scroll", schedule, { passive: true }); addEventListener("resize", schedule); paint();
      cleanup = () => {
        observer.disconnect(); cancelAnimationFrame(frame);
        removeEventListener("scroll", schedule); removeEventListener("resize", schedule);
        reveals.forEach(item => item.classList.remove(styles.pending, styles.visible));
        moving.forEach(item => item.style.removeProperty("--parallax")); el.style.removeProperty("--hero-scroll");
      };
    }
    setup(); media.addEventListener("change", setup);
    return () => { cleanup(); media.removeEventListener("change", setup); };
  }, []);
  useEffect(() => {
    if (selected === null) return;
    dialog.current.showModal(); closeButton.current?.focus();
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [selected]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = event => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    addEventListener("keydown", close); return () => removeEventListener("keydown", close);
  }, [menuOpen]);
  function openProject(index, event) { trigger.current = event.currentTarget; setSelected(index); }
  function closeProject() { dialog.current.close(); setSelected(null); trigger.current?.focus(); }

  return <div ref={root} className={`${styles.home} ${paused ? styles.paused : ""}`}>
    <a className={styles.skip} href="#home-content">Skip to content</a>
    <header className={styles.header}>
      <a href="#" className={styles.logo} aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128} preload /></a>
      <nav className={styles.navigation} aria-label="Homepage navigation"><a href="#work">Our work</a><a href="#studio">The studio</a><a href="#services">What we do</a></nav>
      <Link href="/contact" className={styles.navCta}>Let’s talk</Link>
      <button ref={menuButton} className={styles.menuToggle} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="studio-menu" aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? "Close" : "Menu"}<span>{menuOpen ? "−" : "+"}</span></button>
      {menuOpen && <nav id="studio-menu" className={styles.mobileMenu} aria-label="Mobile homepage navigation"><a href="#work" onClick={() => setMenuOpen(false)}>Our work</a><a href="#studio" onClick={() => setMenuOpen(false)}>The studio</a><a href="#services" onClick={() => setMenuOpen(false)}>What we do</a><Link href="/contact">Let’s talk</Link></nav>}
    </header>
    <main id="home-content">
      <section className={styles.hero} data-hero>
        <div className={styles.heroTop}><p className={styles.eyebrow}>Independent minds. Shared ambition.</p><span>Strategy / Design / Digital</span></div>
        <div className={styles.heroGrid}>
          <h1><span><b>Good ideas.</b></span><span><b>Great <em>impact.</em></b></span></h1>
          <div className={styles.heroIntro}><p>Websites, branding and content that make your business clearer, more confident and easier to choose.</p><a href="#work" className={styles.pill}>Explore our work</a><span className={styles.heroNote}>Your next chapter starts here.</span></div>
        </div>
        <div className={styles.heroGallery} aria-label="JovaMedia studio design explorations">
          <button className={`${styles.heroCard} ${styles.leftCard}`} onClick={event => openProject(2, event)} aria-label="Explore Stillleaf concept"><Image src="/home-studio/stillleaf.webp" alt={projects[2].description} fill sizes="(max-width:700px) 30vw,30vw" preload /><span>Stillleaf <Arrow /></span></button>
          <button className={`${styles.heroCard} ${styles.middleCard}`} onClick={event => openProject(0, event)} aria-label="Explore Costa design study"><Image src="/home-studio/costa.webp" alt={projects[0].description} fill sizes="(max-width:700px) 55vw,45vw" preload /><span>Costa, reimagined <Arrow /></span></button>
          <button className={`${styles.heroCard} ${styles.rightCard}`} onClick={event => openProject(1, event)} aria-label="Explore Vellune concept"><Image src="/home-studio/vellune.webp" alt={projects[1].description} fill sizes="(max-width:700px) 30vw,30vw" preload /><span>Vellune <Arrow /></span></button>
        </div>
        <div className={styles.heroBottom}><span>Ideas made tangible.</span><a href="#studio">Scroll to discover <span aria-hidden="true">↓</span></a><span>Selected studio explorations</span></div>
      </section>
      <section id="studio" className={styles.studio}>
        <div className={styles.sectionLabel}><span>01 / THE STUDIO</span><Mark /></div>
        <div data-reveal className={styles.studioCopy}><h2>Good design gets noticed.<br /><span>Great thinking makes it matter.</span></h2><div className={styles.studioBottom}><p>We’re JovaMedia, your creative digital partner. Whether you’re starting something new or have outgrown your current look, we connect the strategy, design and content that move your business forward.</p><Link href="/about" className={styles.textLink}>A little about us <Arrow /></Link></div><div className={styles.studioFacts}><div><h3>One joined-up direction.</h3><p>Your website, brand and content should feel like the same business.</p></div><div><h3>Built around your goals.</h3><p>A focused scope, a clear plan and room to grow at your pace.</p></div><div><h3>Care beyond the launch.</h3><p>Practical support to keep your digital presence moving forward.</p></div></div></div>
      </section>
      <div className={styles.marquee}><div className={styles.marqueeTrack} aria-hidden="true">{[0, 1].map(i => <div key={i}><span>Fresh thinking</span><Mark /><span>Considered design</span><Mark /><span>Real connection</span><Mark /></div>)}</div><span className={styles.srOnly}>Fresh thinking. Considered design. Real connection.</span><button className={styles.motionToggle} onClick={() => setPaused(!paused)} aria-label={paused ? "Play scrolling text" : "Pause scrolling text"}>{paused ? "▶" : "Ⅱ"}</button></div>
      <section id="work" className={styles.work}>
        <div className={styles.workHeading} data-reveal><div><p className={styles.eyebrow}>02 / SELECTED EXPLORATIONS</p><h2>A taste of<br />what’s possible<span>.</span></h2></div><p>New perspectives.<br />Made to move you.</p></div>
        <div className={styles.projectGrid}>
          {projects.map((project, index) => <article className={`${styles.project} ${styles[`project${index}`]}`} key={project.name} data-reveal><button className={`${styles.projectImage} ${styles[project.tone]}`} onClick={event => openProject(index, event)} aria-label={`View ${project.name}`}><div data-parallax={index === 1 ? "-50" : "55"}><Image src={`/home-studio/${project.image}.webp`} alt={project.description} fill sizes="(max-width:700px) 100vw,50vw" /></div><span className={styles.projectOpen}><Arrow /></span></button><div className={styles.projectMeta}><h3>{project.name}</h3><span>{project.type}</span></div></article>)}
          <div className={styles.projectInvitation} data-reveal><span>YOUR NEXT CHAPTER</span><h3>Something<br />good starts<br />with a hello.</h3><Link href="/contact" className={styles.textLink}>Tell us what you have in mind <Arrow /></Link></div>
        </div><p className={styles.workNote}>A selection of self-initiated concepts and independent design studies.</p>
      </section>
      <section id="services" className={styles.services}>
        <div className={styles.servicesHeading} data-reveal><div><p className={styles.eyebrow}>03 / WHAT WE DO</p><h2>From the first idea<br />to the next big thing.</h2></div><p>The right mix of strategy,<br />creativity and digital craft.</p></div>
        <div className={styles.serviceList}>{services.map((service, index) => <article key={service.name} className={styles.service} data-reveal><div className={styles.serviceArt}><Image src={`/home-studio/${service.image}.webp`} alt="" fill sizes="180px" /></div><div className={styles.serviceContent}><span className={styles.serviceNumber}>0{index + 1}</span><h3>{service.name}</h3><p>{service.summary}</p><div className={styles.tags}>{service.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className={styles.serviceLinks}>{service.links.map(([label, slug]) => <Link href={`/services/${slug}`} key={slug}>{label}</Link>)}</div></div><Link href={service.href} className={styles.serviceArrow} aria-label={`Explore ${service.name}`}><Arrow /></Link></article>)}</div>
        <Link href="/services" className={styles.allServices}>Explore all our services <Arrow /></Link>
      </section>
      <section className={styles.process}>
        <div className={styles.processHeading} data-reveal><p className={styles.eyebrow}>04 / HOW WE WORK</p><h2>A clear path.<br />A shared ambition.</h2></div>
        <ol className={styles.processSteps}>
          <li data-reveal><span>01</span><h3>Find the focus.</h3><p>We get to know your business, your audience and what needs to change. Together, we agree the priorities and scope.</p></li>
          <li data-reveal><span>02</span><h3>Make it happen.</h3><p>We shape the words, design and experience. You’re involved at the right moments, with clear progress and room for feedback.</p></li>
          <li data-reveal><span>03</span><h3>Launch with confidence.</h3><p>We check the details, prepare your handover and agree any ongoing support. You know what’s ready and what comes next.</p></li>
        </ol>
      </section>
      <section className={styles.faq}>
        <div data-reveal><p className={styles.eyebrow}>A LITTLE CLARITY</p><h2>Good questions.<br />Straight answers.</h2></div><div className={styles.questions} data-reveal>
          <details><summary>Where do we start?<span>+</span></summary><p>With a conversation about your business, what you want to change and what success looks like. We’ll recommend a clear, manageable starting point.</p></details>
          <details><summary>Can you work with what we already have?<span>+</span></summary><p>Absolutely. We can build on your existing brand or website, or help shape a new direction. We’ll agree what’s worth keeping and what needs to move forward.</p></details>
          <details><summary>Do we need the whole package?<span>+</span></summary><p>No. Start with the work that matters most, whether that’s a website, a brand refresh or content. We shape the scope around your priorities.</p></details>
        </div>
      </section>
      <section className={styles.contact} data-reveal><p className={styles.eyebrow}>GOT SOMETHING IN MIND?</p><h2>Let’s make<br /><span>your next move.</span></h2><Link href="/contact" className={styles.contactButton}>Start a conversation <Arrow /></Link><a className={styles.email} href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a></section>
    </main>
    <footer className={styles.footer}><div className={styles.footerTop}><span>Independent thinking.<br />Together, better.</span><nav aria-label="Footer navigation"><Link href="/about">The studio</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link></nav><a href="#">Back to top ↑</a></div><div className={styles.footerWordmark}><Image src="/brand/jova-logo-white.png" alt="JovaMedia" width={361} height={128} /></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} JovaMedia</span><div><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><CookieConsent /></div><span>Made with intention.</span></div></footer>
    <dialog ref={dialog} className={styles.projectDialog} onCancel={event => { event.preventDefault(); closeProject(); }} onClick={event => { if (event.target === event.currentTarget) closeProject(); }} aria-labelledby="project-title">
      {selected !== null && <div className={styles.dialogInner}><button ref={closeButton} className={styles.dialogClose} onClick={closeProject} aria-label="Close project">Close <span>×</span></button><div className={styles.dialogImage}><Image src={`/home-studio/${projects[selected].image}.webp`} alt={projects[selected].description} fill sizes="(max-width:700px) 90vw,50vw" /></div><div className={styles.dialogCopy}><p className={styles.eyebrow}>{projects[selected].type}</p><h2 id="project-title">{projects[selected].name}</h2><p>{projects[selected].detail}</p><Link href="/contact" className={styles.pill}>Talk about your project</Link></div></div>}
    </dialog>
  </div>;
}

