import Image from "next/image";
import { serviceArt, serviceArtAlt } from "@/lib/service-art";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { primaryServices } from "@/lib/service-catalogue";
import styles from "./services.module.css";
import MotionRegion from "@/components/MotionRegion";
import PhotoHero from "@/components/PhotoHero";
import { FaqStory } from "@/components/ScrollStories";

export const metadata = pageMetadata("/services", "Digital Services for UK Small Businesses | JovaMedia", "Explore JovaMedia's branding, social media, copywriting, email marketing, search visibility and systems services. Website design has its own dedicated section.");

export default function Page() {
  return <main className={styles.catalogue}>
    <PhotoHero image="services" className={`page-hero ${styles.hero}`}>
      <div className="shell">

        <h1>Everything you need<br /><em>to grow.</em></h1>
        <p className="lead">A clearer message, a stronger identity or more connected tools. Choose the support your business needs.</p>
        <div className="actions"><Link className="btn" href="/contact">Contact Us</Link><Link className="text-link" href="/websites">Looking for a website?</Link></div>
      </div>
    </PhotoHero>
    <section className={`section ${styles.directory}`} id="services" aria-label="Our digital services">
      <div className="shell">
        <MotionRegion className={styles.directoryGrid} enterOnly>
          {primaryServices.map((service, index) => <Link key={service.slug} href={`/services/${service.slug}`} className={styles.directoryCard} data-motion-card style={{ "--card-delay": `${index % 3 * 40}ms` }}>
            <div className={styles.directoryImage} style={{ aspectRatio: service.slug === "system-modernization" ? "1" : "4 / 3" }}><Image src={`/service-crafted/${serviceArt[service.slug]}.webp`} alt={serviceArtAlt[service.slug]} fill sizes="(max-width:700px) 90vw, (max-width:900px) 50vw, (max-width:1100px) 30vw, 24vw" /></div>
            <div className={styles.directoryBody}>

              <h2>{service.name}</h2><p>{service.summary}</p>
              <div className={styles.cardFoot}><span>Explore service</span></div>
            </div>
          </Link>)}
        </MotionRegion>

      </div>
    </section>
    <FaqStory />
    <section className={`section ${styles.custom}`}><div className="shell"><h2>One project. A useful combination.</h2><p className="lead">Tell us what you want to achieve. We’ll put together a clear scope and quote, counting shared work once.</p><Link href="/get-a-quote" className="btn">Get a Quote</Link></div></section>
  </main>;
}
