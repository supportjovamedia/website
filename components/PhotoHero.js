import Image from "next/image";
import s from "./PhotoHero.module.css";
import PhotoHeroMotion from "./PhotoHeroMotion";

// Decorative photography stays behind the existing hero copy and navy overlay.
export default function PhotoHero({ image, src, className = "", children }) {
  return <section className={`${className} ${s.hero}`} data-photo-hero>
    <div className={s.backdrop} data-hero-backdrop aria-hidden="true">
      <Image src={src || `/hero-backgrounds/${image}.webp`} alt="" fill sizes="100vw" loading="eager" fetchPriority="high" />
    </div>
    <div className={s.overlay} data-hero-overlay aria-hidden="true" />
    <PhotoHeroMotion />
    {children}
  </section>;
}
