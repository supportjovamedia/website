import Link from "next/link";
import Image from "next/image";
import s from "./WhyJovaPreview.module.css";

const values = [
  { photo: "compass", title: ["Strategy", "with a reason."], copy: "Every decision starts with what your business needs to achieve." },
  { photo: "pen", image: "/why-jova/approved/design-bakery.webp", alt: "Coordinated bakery branding with burgundy packaging, a patterned cup and a croissant", title: ["Design", "people remember."], copy: "Distinctive work built around your brand, not a template." },
  { photo: "laptop", title: ["Everything", "works together."], copy: "Design, content and technology developed as one system." },
  { photo: "headphones", title: ["We don’t", "disappear at launch."], copy: "You still have a partner when the website goes live." },
];

export default function WhyJovaPreview() {
  return <section className={s.section} id="why-jova" aria-labelledby="why-jova-heading">
    <div className={s.inner}>
      <div className={s.intro} data-reveal>
        <p className={s.label}>WHY JOVA</p>
        <h2 id="why-jova-heading">A digital partner.<br />Not just a deliverable.</h2>
        <p className={s.introCopy}>One partner for strategy, design, content and delivery.<br className={s.desktopBreak} /> Less chasing. Fewer handoffs. Better work.</p>
        <Link className={s.cta} href="/contact">Start a project</Link>
      </div>
      <div className={s.values}>
        {values.map(({ photo, image, alt, title, copy }, index) => <article className={s.value} data-scroll style={{ "--order": index }} key={photo}>
          {image && <div className={s.art}><Image src={image} alt={alt} width={1448} height={1086} sizes="(max-width: 700px) 43vw, (max-width: 1100px) 22vw, 14vw" /></div>}
          <span className={s.rule} aria-hidden="true" />
          <h3>{title.map(line => <span key={line}>{line}</span>)}</h3>
          <p>{copy}</p>
        </article>)}
      </div>
    </div>
  </section>;
}
