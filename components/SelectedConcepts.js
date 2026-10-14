import Image from "next/image";
import Link from "next/link";
import s from "./SelectedConcepts.module.css";

const concepts = [
  { name: "Sumera’s", image: "sumera-current", category: "Hair & beauty", width: 1440, height: 5440 },
  { name: "Qaiser Watches", image: "qaiser-watches", category: "Watches & retail", width: 1440, height: 4853 },
  { name: "Al Eiman", image: "al-eiman", category: "Travel & pilgrimage", width: 1440, height: 6899 },
];

export default function SelectedConcepts() {
  return <section id="work" className={s.section} aria-labelledby="concepts-title">
    <header className={s.heading} data-reveal>
      <div><h2 id="concepts-title">Digital experiences.<br />Made to stand out.</h2></div>
      <span>Scroll inside each preview to see the full website.<br />On mobile, swipe up inside the picture.</span>
    </header>
    <div className={s.grid}>
      {concepts.map((concept, index) => <figure key={concept.image} data-reveal style={{ "--delay": `${index % 3 * 80}ms` }}>
        <div className={s.preview}>
          <div className={s.browserBar} aria-hidden="true"><span>● ● ●</span><span>{concept.name}</span></div>
          <div className={s.hint} id={`preview-hint-${concept.image}`}><svg viewBox="0 0 20 24" width="16" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="2" width="14" height="20" rx="7"/><path d="M10 6v5"/></svg><span>Scroll to explore</span></div>
          <div className={s.image} tabIndex={0} role="region" aria-label={`${concept.name} website preview, scroll to explore`} aria-describedby={`preview-hint-${concept.image}`}>
            <Image src={`/home-selected/${concept.image}.png`} alt={`${concept.name}: ${concept.category.toLowerCase()} website, showing the homepage and service or product information`} width={concept.width} height={concept.height} sizes="(max-width:700px) 90vw, (max-width:1050px) 45vw,31vw" draggable={false} />
          </div>
        </div>
        <figcaption><strong>{concept.name}</strong><span>{concept.category}</span>{concept.name === "Qaiser Watches" && <Link href="/work/qaiser-watches">Read the case study</Link>}</figcaption>
      </figure>)}
    </div>
  </section>;
}
