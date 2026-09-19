import Image from "next/image";
import s from "./SelectedConcepts.module.css";

const concepts = [
  { name: "Daybreak", image: "daybreak", alt: "Daybreak coffee website with an orange hero and iced coffee" },
  { name: "Stillleaf", image: "stillleaf", alt: "Stillleaf Matcha website with green typography and a matcha bowl" },
  { name: "Vellune", image: "vellune", alt: "Vellune fragrance website with a warm neutral palette and perfume bottle" },
];

export default function SelectedConcepts() {
  return <section id="work" className={s.section} aria-labelledby="concepts-title">
    <header className={s.heading} data-reveal>
      <p>(02) SELECTED CONCEPTS</p>
      <h2 id="concepts-title">Digital experiences.<br />Made to stand out.</h2>
    </header>
    <div className={s.grid}>
      {concepts.map(({ name, image, alt }, index) => <figure key={name} data-reveal style={{ "--delay": `${index * 80}ms` }}>
        <div className={s.image}><Image src={`/home-selected/${image}.webp`} alt={alt} fill sizes="(max-width: 700px) 90vw, 31vw" /></div>
        <figcaption>{name}</figcaption>
      </figure>)}
    </div>
  </section>;
}
