import Image from "next/image";
import { serviceArt, serviceArtAlt } from "@/lib/service-art";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, serviceSchema } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import { FaqStory } from "@/components/ScrollStories";
import SelectedConcepts from "@/components/SelectedConcepts";
import WebsiteServiceDetails from "@/components/WebsiteServiceDetails";
import { services } from "@/lib/service-catalogue";
import styles from "../services.module.css";

export function generateStaticParams() { return services.map(({ slug }) => ({ slug })); }
const searchTitles = {
  "web-design":"Website Design in Harrow & London | JovaMedia",
  "system-modernization":"Legacy Software Modernisation UK | JovaMedia",
  "social-management":"Social Media Management for Small Businesses UK",
  "brand-strategy":"Brand Strategy & Design for Small Businesses UK",
  content:"Website Copywriting Services UK",
  "email-marketing":"Email Marketing & Automation Services UK",
  seo:"SEO & Local Search Services for Small Businesses UK",
};
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  return service ? pageMetadata(`/services/${slug}`, searchTitles[slug] || service.name, service.summary) : {};
}
export default async function Page({ params }) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();
  const relatedSlugs = {
    "system-modernization": ["web-design", "email-marketing", "seo"],
    "web-design": ["content", "brand-strategy", "seo"],
    content: ["web-design", "seo", "email-marketing"],
    "social-management": ["seo", "brand-strategy", "email-marketing"],
    "brand-strategy": ["web-design", "content", "social-management"],
    "email-marketing": ["web-design", "content", "social-management"],
    seo: ["web-design", "content", "social-management"],
  };
  const related = relatedSlugs[slug].map((id) => services.find((s) => s.slug === id));
  return <main className={styles.catalogue}>
    <StructuredData data={serviceSchema(service)} />
    <section className={`page-hero ${styles.hero}`}><div className="shell">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Services", path: "/services" }, { name: service.name, path: `/services/${slug}` }]} />
      <div className={styles.heroGrid}><div>
        <h1>{slug === "web-design" ? "Website design in Harrow and London." : service.name}</h1><p className="lead">{service.desc}</p>
        <div className="actions"><Link href="/get-a-quote" className="btn">Get a Quote</Link><Link href="/contact" className="text-link">Contact Us</Link></div>
      </div><div className={styles.heroArt} style={{ aspectRatio: slug === "system-modernization" ? "1" : "4 / 3" }}><Image src={`/service-crafted/${serviceArt[slug]}.webp`} alt={serviceArtAlt[slug]} fill sizes="(max-width:700px) 85vw, 40vw" preload /></div></div>
    </div></section>
    <section className={styles.fitSection}><div className="shell"><aside className={styles.fit} aria-label="Is this service right for you?">
        <h2>A good fit when…</h2><ul>{service.fit.map((item) => <li key={item}>{item}</li>)}</ul>
      </aside></div></section>
    <section id="how-we-help" className={`section ${styles.help}`}><div className="shell">
      <div className={styles.sectionIntro}><h2>The right support.<br />For what comes next.</h2><p>Choose a focused piece of work or bring these services together around your brief.</p></div>
      <div className={styles.helpGrid}>{service.help.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
    </div></section>
    {slug === "web-design" && <SelectedConcepts />}
    {slug === "web-design" && <WebsiteServiceDetails />}
    <section className={`section ${styles.process}`}><div className="shell"><h2>A clear path from brief to delivery.</h2><div className={styles.processGrid}>{service.process.map((step) => <div key={step.title}><h3>{step.title}</h3><p>{step.text}</p></div>)}</div></div></section>
    <FaqStory items={service.faq} />
    <section className={`section ${styles.custom}`}><div className="shell"><h2>Let’s make the next step clear.</h2><p className="lead">{service.custom}</p><Link href="/get-a-quote" className="btn">Get a Quote</Link></div></section>
    <section className={`section ${styles.related}`}><div className="shell"><h2>Explore related services</h2><div className={styles.relatedGrid}>{related.map((item) => <Link key={item.slug} href={`/services/${item.slug}`}><h3>{item.name}</h3><p>{item.summary}</p><span className="text-link">Explore service</span></Link>)}</div><Link className="text-link" href="/services">View all services</Link></div></section>
  </main>;
}
