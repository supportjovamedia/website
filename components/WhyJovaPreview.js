import Link from "next/link";
import Image from "next/image";
import s from "./WhyJovaPreview.module.css";
import MotionRegion from "./MotionRegion";

const values = [
  { photo: "compass", image: "/why-jova/approved/strategy-planning.webp", alt: "Creative planning with reference books, photographs, pencils and material swatches", title: ["Strategy", "with a reason."], copy: "Every decision starts with what your business needs to achieve." },
  { photo: "pen", image: "/why-jova/approved/design-gelato.webp", alt: "Pistachio gelato with a coordinated lilac and coral visual identity across packaging and photography", title: ["Design", "people remember."], copy: "Distinctive work built around your brand, not a template." },
  { photo: "laptop", image: "/why-jova/approved/together-green-brandkit.webp", alt: "A complete botanical brand identity across logo, business cards, stationery, packaging and campaign materials", title: ["Everything", "works together."], copy: "Design, content and technology developed as one system." },
  { photo: "headphones", image: "/why-jova/approved/launch-campaign.webp", alt: "Coordinated coffee packaging and photographic campaign assets prepared for launch", title: ["We don’t", "disappear at launch."], copy: "You still have a partner when the website goes live." },
];

export default function WhyJovaPreview() {
  return <section className={s.section} id="why-jova" aria-labelledby="why-jova-heading">
    <div className={s.inner}>
      <div className={s.intro} data-site-reveal>
        <p className={s.label}>WHY JOVA</p>
        <h2 id="why-jova-heading">A digital partner.<br />Not just a deliverable.</h2>
        <p className={s.introCopy}>One partner for strategy, design, content and delivery.<br className={s.desktopBreak} /> Less chasing. Fewer handoffs. Better work.</p>
        <Link className={s.cta} data-enquiry-cta href="/get-a-quote">Get a Quote</Link>
      </div>
      <MotionRegion className={s.values}>
        {values.map(({ photo, image, alt, title, copy }, index) => <article className={s.value} data-motion-card style={{ "--card-delay": `${index * 40}ms`, "--phone-delay": `${index % 2 * 40}ms` }} key={photo}>
          {image && <div className={s.art}><Image src={image} alt={alt} width={1448} height={1086} sizes="(max-width: 359px) 90vw, (max-width: 700px) 43vw, (max-width: 1100px) 22vw, 16vw" /></div>}
          <span className={s.rule} aria-hidden="true" />
          <h3>{title.map(line => <span key={line}>{line}</span>)}</h3>
          <p>{copy}</p>
        </article>)}
      </MotionRegion>
    </div>
  </section>;
}
