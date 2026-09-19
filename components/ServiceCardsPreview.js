import Image from "next/image";
import Link from "next/link";
import s from "./ServiceCardsPreview.module.css";

const services = [
  { title: ["Website", "Development"], slug: "web-design", photo: "/home-agency/hero-websites.webp", kind: "website" },
  { title: ["Copywriting"], slug: "content", photo: "/service-editorial/copywriting.jpg", kind: "copywriting" },
  { title: ["Social Media", "Management"], slug: "social-management", photo: "/service-editorial/social.jpg", kind: "social" },
  { title: ["Brand Strategy", "& Design"], slug: "brand-strategy", photo: "/service-editorial/branding.jpg", kind: "branding" },
  { title: ["Email Marketing", "& Automation"], slug: "email-marketing", photo: "/service-editorial/email.jpg", kind: "email" },
  { title: ["Content", "Production"], slug: "content-production", photo: "/service-editorial/camera.jpg", kind: "camera" },
];

function ForwardArrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function EmailScreen() {
  return <div className={s.emailScreen} aria-hidden="true"><span className={s.emailTopline} /><div className={s.emailRows}>{[0, 1, 2, 3].map(i => <span key={i}><svg viewBox="0 0 24 18"><rect x="1" y="1" width="22" height="16" rx="1" /><path d="m1 2 11 8L23 2" /></svg><i /></span>)}</div></div>;
}

export default function ServiceCardsPreview() {
  return <section className={s.section} id="services" aria-labelledby="services-heading">
    <div className={s.inner}>
      <header className={s.heading} data-reveal>
        <p className={s.eyebrow}><span>03</span><b>/</b> OUR SERVICES <i aria-hidden="true" /></p>
        <h2 id="services-heading" className={s.title}>Everything you need to <em>grow.</em></h2>
      </header>
      <div className={s.grid}>
        {services.map(({ title, slug, photo, kind }, index) => <div className={s.cardWrap} data-reveal style={{ "--delay": `${index * 65}ms` }} key={slug}>
          <Link className={s.card} href={`/services/${slug}`} aria-label={`Explore ${title.join(" ")}`}>
            <div className={s.cardHeading}><span className={s.rule} aria-hidden="true" /><h3>{title.map(line => <span key={line}>{line}</span>)}</h3></div>
            <div className={`${s.visual} ${s[kind]}`} aria-hidden="true">
              <div className={s.photoStage}>
                <Image src={photo} alt="" fill sizes="(max-width: 350px) 90vw, (max-width: 620px) 45vw, (max-width: 1100px) 30vw, 17vw" />
                {kind === "email" && <EmailScreen />}
              </div>
            </div>
            <span className={s.action}><ForwardArrow /></span>
          </Link>
        </div>)}
      </div>
    </div>
  </section>;
}
