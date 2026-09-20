import Image from "next/image";
import s from "./SelectedConcepts.module.css";

const concepts = [
  { name: "Sumera’s", image: "sumera", category: "Hair, beauty & academy", width: 789, height: 1994 },
  { name: "KOVA", image: "kova", category: "Coffee & hospitality", width: 870, height: 1808 },
  { name: "Knitly", image: "knitly", category: "Handmade & lifestyle", width: 870, height: 1808 },
  { name: "NÉRA", image: "nera", category: "Fragrance & beauty", width: 787, height: 1999 },
  { name: "NEXO", image: "nexo", category: "Construction & architecture", width: 826, height: 1904 },
  { name: "Dolcé", image: "dolce", category: "Cakes & sweets", width: 843, height: 1866 },
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
