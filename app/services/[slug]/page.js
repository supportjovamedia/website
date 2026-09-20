import Image from "next/image";
import { serviceArt } from "@/lib/service-art";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, serviceSchema } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import { services, primaryServices } from "@/lib/service-catalogue";
import styles from "../services.module.css";

export function generateStaticParams() { return services.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  return service ? pageMetadata(`/services/${slug}`, service.name, service.summary) : {};
}
export default async function Page({ params }) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();
  const relatedSlugs = {
    "legacy-software-updates": ["web-design", "email-marketing", "seo"],
    "web-design": ["content", "brand-strategy", "seo"],
    content: ["web-design", "content-production", "email-marketing"],
    "social-management": ["content-production", "brand-strategy", "email-marketing"],
    "brand-strategy": ["web-design", "content", "social-management"],
    "email-marketing": ["web-design", "content", "social-management"],
    "content-production": ["social-management", "content", "brand-strategy"],
    seo: ["web-design", "content", "social-management"],
  };
  const related = relatedSlugs[slug].map((id) => services.find((s) => s.slug === id));
  const index = primaryServices.findIndex((s) => s.slug === slug);
  return <main className={styles.catalogue}>
    <StructuredData data={serviceSchema(service)} />
    <section className={`page-hero ${styles.hero}`}><div className="shell">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Services", path: "/services" }, { name: service.name, path: `/services/${slug}` }]} />
      <div className={styles.heroGrid}><div>
        <p className="kicker">{service.eyebrow}</p><h1>{service.name}</h1><p className="lead">{service.desc}</p>
        <div className="actions"><Link href="/contact" className="btn">Discuss your project</Link><a href="#how-we-help" className="text-link">See how we can help</a></div>
      </div><div className={styles.heroArt}><Image src={`/service-crafted/${serviceArt[slug]}.webp`} alt="" fill sizes="(max-width:700px) 85vw, 40vw" preload /></div></div>
    </div></section>
    <section className={styles.fitSection}><div className="shell"><aside className={styles.fit} aria-label="Is this service right for you?">
        <span className={styles.serviceIndex} aria-hidden="true">{index < 0 ? "S" : `0${index + 1}`}</span>
        <h2>A good fit when…</h2><ul>{service.fit.map((item) => <li key={item}>{item}</li>)}</ul>
      </aside></div></section>
    <section id="how-we-help" className={`section ${styles.help}`}><div className="shell">
      <div className={styles.sectionIntro}><p className="kicker">How we can help</p><h2>The right support.<br />For what comes next.</h2><p>Choose a focused piece of work or bring these services together around your brief.</p></div>
      <div className={styles.helpGrid}>{service.help.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
    </div></section>
    <section className={`section ${styles.process}`}><div className="shell"><p className="kicker">Working together</p><h2>A clear path from brief to delivery.</h2><div className={styles.processGrid}>{service.process.map((step, i) => <div key={step.title}><span aria-hidden="true">0{i + 1}</span><h3>{step.title}</h3><p>{step.text}</p></div>)}</div></div></section>
    <section className={`section ${styles.questions}`}><div className="shell"><h2>A few useful answers.</h2>{service.faq.map(([question, answer]) => <details className={styles.question} key={question}><summary><span>{question}</span><span className={styles.plus} aria-hidden="true">+</span></summary><div><p>{answer}</p></div></details>)}</div></section>
    <section className={`section ${styles.custom}`}><div className="shell"><p className="kicker">Made around your brief</p><h2>Let’s make the next step clear.</h2><p className="lead">{service.custom}</p><Link href="/contact" className="btn">Tell us what you have in mind</Link></div></section>
    <section className={`section ${styles.related}`}><div className="shell"><h2>Explore related services</h2><div className={styles.relatedGrid}>{related.map((item) => <Link key={item.slug} href={`/services/${item.slug}`}><h3>{item.name}</h3><p>{item.summary}</p><span className="text-link">Explore service</span></Link>)}</div><Link className="text-link" href="/services">View all services</Link></div></section>
  </main>;
}
