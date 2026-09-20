import Image from "next/image";
import { serviceArt } from "@/lib/service-art";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { primaryServices } from "@/lib/service-catalogue";
import styles from "./services.module.css";

export const metadata = pageMetadata("/services", "Websites, Copywriting & Creative Services", "Explore websites, copywriting, social media, brand strategy and design, email automation and content production from JovaMedia, your London digital partner.");

export default function Page() {
  return <main className={styles.catalogue}>
    <section className={`page-hero ${styles.hero}`}>
      <div className="shell">
        <p className="kicker">What we offer</p>
        <h1>Everything you need<br /><em>to grow.</em></h1>
        <p className="lead">A new website, a clearer message or a more consistent presence. Start with one service, or bring a few together around your business.</p>
        <div className="actions"><a className="btn" href="#services">Find your service</a><Link className="text-link" href="/contact">Talk through your brief</Link></div>
      </div>
    </section>
    <section className={`section ${styles.directory}`} id="services" aria-label="Our six services">
      <div className="shell">
        <div className={styles.directoryGrid}>
          {primaryServices.map((service, i) => <Link key={service.slug} href={`/services/${service.slug}`} className={styles.directoryCard}>
            <div className={styles.directoryImage}><Image src={`/service-crafted/${serviceArt[service.slug]}.webp`} alt="" fill sizes="(max-width:700px) 90vw, 30vw" /></div><span className={styles.number}>0{i + 1}</span>
            <p className="kicker">{service.eyebrow}</p>
            <h2>{service.name}</h2><p>{service.summary}</p>
            <div className={styles.cardFoot}><span>Explore service <span aria-hidden="true">↗</span></span></div>
          </Link>)}
        </div>
        <div className={styles.supportLink}><div><h2>Already online. Ready to be found?</h2><p>Search and local visibility support is also available for your website and Google Business Profile.</p></div><Link className="text-link" href="/services/seo">Explore search & local visibility</Link></div>
      </div>
    </section>
    <section className={`section ${styles.custom}`}><div className="shell"><p className="kicker">Made around your brief</p><h2>One project. A useful combination.</h2><p className="lead">Tell us what you want to achieve. We’ll put together a clear scope and quote, counting shared work once.</p><Link href="/contact" className="btn">Let’s plan your project</Link></div></section>
  </main>;
}
