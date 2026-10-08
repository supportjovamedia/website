import Image from "next/image";
import s from "./SelectedConcepts.module.css";

const concepts = [
  { name: "Sumera’s", image: "sumera-current", category: "Hair & beauty", width: 1440, height: 5440 },
  { name: "Qaiser Watches", image: "qaiser-watches", category: "Watches & retail", width: 1440, height: 4853 },
  { name: "Al Eiman", image: "al-eiman", category: "Travel & pilgrimage", width: 1440, height: 6899 },
];

export default function SelectedConcepts() {
  return <section id="work" className={s.section} aria-labelledby="concepts-title">
    <header className={s.heading} data-reveal>
      <div><p>(02) OUR WORK</p><h2 id="concepts-title">Digital experiences.<br />Made to stand out.</h2></div>
      <span>Different businesses. Distinctive design.<br />Scroll inside each preview to explore.</span>
    </header>
    <div className={s.grid}>
      {concepts.map((concept, index) => <figure key={concept.image} data-reveal style={{ "--delay": `${index % 3 * 80}ms` }}>
        <div className={s.preview}>
          <div className={s.browserBar} aria-hidden="true"><span>● ● ●</span><span>{concept.name}</span></div>
          <div className={s.image} tabIndex={0} role="region" aria-label={`${concept.name} website preview, scroll to explore`}>
            <Image src={`/home-selected/${concept.image}.png`} alt={`${concept.name} website`} width={concept.width} height={concept.height} sizes="(max-width:700px) 90vw, (max-width:1050px) 45vw,31vw" draggable={false} />
          </div>
          <div className={s.hint} aria-hidden="true">Scroll to explore <span>↓</span></div>
        </div>
        <figcaption><strong>{concept.name}</strong><span>{concept.category}</span></figcaption>
      </figure>)}
    </div>
  </section>;
}
