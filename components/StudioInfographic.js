import Image from "next/image";
import s from "./StudioInfographic.module.css";

export default function StudioInfographic() {
  return <figure className={s.figure} aria-labelledby="studio-story-title">
    <figcaption><p className={s.eyebrow}>OUR STARTING POINT</p><h2 id="studio-story-title">Designing since 2016.</h2><p>Clear thinking, thoughtful design and practical technology.</p></figcaption>
    <div className={s.photo}><Image src="/home-agency/designer-colour-workspace.webp" alt="Colour samples, pens and a sketchbook on a graphic designer’s desk" fill sizes="(max-width:700px) 90vw, 45vw" /></div>
  </figure>;
}
