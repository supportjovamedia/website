import Image from "next/image";
import Link from "next/link";
import { primaryServices } from "@/lib/service-catalogue";
import styles from "./HomeVisualSections.module.css";

// Reuse the approved artwork without baking screenshot headings into the page.
function Artwork({ sheet, crop }) {
  const [x, y, width, height] = crop;
  return (
    <div className={styles.art} style={{ aspectRatio: `${width} / ${height}` }}>
      <Image src={`/campaign/${sheet}-art-sheet.png`} alt="" width={1024} height={1536}
        sizes="(max-width: 700px) 800px, 1200px"
        style={{ width: `${1024 / width * 100}%`, height: `${1536 / height * 100}%`, left: `${-x / width * 100}%`, top: `${-y / height * 100}%` }} />
    </div>
  );
}

const services = [[40,174,460,313],[525,174,460,313],[40,588,460,301],[525,588,460,301],[40,987,460,298],[525,987,460,298]];
const steps = [
  ["Your goals", [45,302,451,450]],
  ["The plan", [529,302,451,450]],
  ["Make it happen", [45,864,451,433]],
  ["Review & refine", [529,864,451,433]],
];
const values = [
  ["A fresh perspective.", [40,278,627,349]],
  ["Care in every detail.", [40,658,627,348]],
  ["Working together.", [40,1032,627,353]],
];

export default function HomeVisualSections() {
  return <>
    <section id="services" className={`shell ${styles.section}`}>
      <header className={styles.heading}><p className="kicker">02 / WHAT WE OFFER</p><h2>What we do.</h2></header>
      <div className={styles.services}>
        {primaryServices.map((service, i) => <Link key={service.slug} href={`/services/${service.slug}`} className={styles.service} data-motion-order={i % 3}>
          <Artwork sheet="services" crop={services[i]} />
          <h3>{service.name}</h3>
        </Link>)}
      </div>
      <div className={styles.action}><Link className="btn" href="/services">Explore our services</Link></div>
    </section>
    <section id="process" className={styles.processBand}>
      <div className={`shell ${styles.section}`}>
        <header className={styles.heading}><p className="kicker">03 / HOW WE WORK</p><h2>From first idea<span>to final result.</span></h2></header>
        <ol className={styles.steps}>{steps.map(([title, crop], i) => <li key={title} data-motion-order={i}>
          <Artwork sheet="process" crop={crop} /><span className={styles.number}>0{i + 1}</span><h3>{title}</h3>
        </li>)}</ol>
        <div className={styles.action}><Link className="btn" href="/about">How we work</Link></div>
      </div>
    </section>
    <section id="why-jova" className={`shell ${styles.section}`}>
      <header className={styles.heading}><p className="kicker">04 / WHY JOVA?</p><h2>Built around<span>your ambition.</span></h2></header>
      <div className={styles.values} data-motion-group="values">{values.map(([title, crop]) => <div className={styles.value} key={title}>
        <Artwork sheet="values" crop={crop} /><h3>{title}</h3>
      </div>)}</div>
      <div className={styles.action}><Link className="btn" href="/about">Meet JovaMedia</Link></div>
    </section>
  </>;
}
