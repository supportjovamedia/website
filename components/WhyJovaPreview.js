import Link from "next/link";
import s from "./WhyJovaPreview.module.css";

const values = [
  { photo: "compass", title: ["Strategy", "with a reason."], copy: "Every decision starts with what your business needs to achieve." },
  { photo: "pen", title: ["Design", "people remember."], copy: "Distinctive work built around your brand, not a template." },
  { photo: "laptop", title: ["Everything", "works together."], copy: "Design, content and technology developed as one system." },
  { photo: "headphones", title: ["We don’t", "disappear at launch."], copy: "You still have a partner when the website goes live." },
];

export default function WhyJovaPreview() {
  return <section className={s.section} id="why-jova" aria-labelledby="why-jova-heading">
    <div className={s.inner}>
      <div className={s.intro} data-reveal>
        <p className={s.label}><span>(05)</span> WHY JOVA</p>
        <h2 id="why-jova-heading">A digital partner.<br />Not just a deliverable.</h2>
        <p className={s.introCopy}>One partner for strategy, design, content and delivery.<br className={s.desktopBreak} /> Less chasing. Fewer handoffs. Better work.</p>
        <Link className={s.cta} href="/contact">Start a project <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
      </div>
      <div className={s.values}>
        {values.map(({ photo, title, copy }, index) => <article className={s.value} data-scroll style={{ "--order": index }} key={photo}>
          <div className={`${s.art} ${s[photo]}`} aria-hidden="true" />
          <span className={s.rule} aria-hidden="true" />
          <h3>{title.map(line => <span key={line}>{line}</span>)}</h3>
          <p>{copy}</p>
        </article>)}
      </div>
    </div>
  </section>;
}
