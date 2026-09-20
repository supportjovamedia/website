"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import s from "./LayeredStudio.module.css";

export default function LayeredStudio({ paused = false }) {
  const section = useRef(null);

  useEffect(() => {
    const node = section.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const paint = () => {
      frame = 0;
      if (paused || reduced.matches) {
        node.style.setProperty("--spread", "1");
        return;
      }
      const bounds = node.getBoundingClientRect();
      const travel = Math.min(bounds.height, window.innerHeight) * 0.8;
      const progress = Math.max(0, Math.min(1, (window.innerHeight * 0.85 - bounds.top) / travel));
      node.style.setProperty("--spread", String(progress * progress * (3 - 2 * progress)));
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(paint); };
    paint();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    reduced.addEventListener("change", request);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      reduced.removeEventListener("change", request);
    };
  }, [paused]);

  return <section className={s.studio} id="studio" ref={section} aria-labelledby="studio-title">
    <div className={s.eyebrow}><span>01 / THE STUDIO</span><span>THINK. MAKE. MOVE.</span></div>
    <div className={s.layout}>
      <div className={s.copy}>
        <h2 id="studio-title">Small details.<br /><em>Big difference.</em></h2>
        <p>Clear thinking. Distinctive design.<br />Digital experiences that move<br />your business forward.</p>
        <Link href="/about" className={s.link}>Meet your digital partner <span aria-hidden="true">↗</span></Link>
      </div>
      <div className={s.stage} aria-label="Strategy, Design and Technology, working together">
        <article className={`${s.paper} ${s.strategy}`}>
          <div className={s.paperHeader}><span>01</span><span>JOVA</span></div>
          <div className={s.map} aria-hidden="true"><i /><i /><i /><i /><b /><b /><b /></div>
          <div className={s.paperFooter}><h3>Strategy.</h3><p>A clearer direction.</p></div>
        </article>
        <article className={`${s.paper} ${s.design}`}>
          <div className={s.paperHeader}><span>02</span><span>JOVA</span></div>
          <div className={s.typeStudy} aria-hidden="true">Aa<span /></div>
          <div className={s.paperFooter}><h3>Design.</h3><p>Impossible to ignore.</p></div>
        </article>
        <article className={`${s.paper} ${s.technology}`}>
          <div className={s.paperHeader}><span>03</span><span>JOVA</span></div>
          <div className={s.browser} aria-hidden="true"><div><i /><i /><i /></div><b>Make<br />your mark.</b><span /><section><i /><i /><i /></section></div>
          <div className={s.paperFooter}><h3>Technology.</h3><p>Built to work beautifully.</p></div>
        </article>
      </div>
    </div>
  </section>;
}
