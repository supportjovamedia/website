"use client";

import { useEffect, useRef } from "react";
import s from "./CapabilityStrip.module.css";

const disciplines = [
  { word: "Think.", label: "Digital thinking" },
  { word: "Design.", label: "Web design" },
  { word: "Build.", label: "Development" },
];

export default function CapabilityStrip({ paused = false }) {
  const section = useRef(null);

  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const paint = () => {
      frame = 0;
      const staticMotion = paused || reduced.matches;
      const bounds = node.getBoundingClientRect();
      const progress = staticMotion
        ? 1
        : clamp((window.innerHeight * 0.88 - bounds.top) / (window.innerHeight * 0.67));
      node.dataset.static = String(staticMotion);
      node.style.setProperty("--progress", String(progress));
      for (let index = 0; index < disciplines.length; index += 1) {
        node.style.setProperty(`--focus-${index}`, String(clamp(1 - Math.abs(progress * 2 - index))));
      }
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

  return (
    <section className={s.strip} ref={section} aria-label="One connected approach: digital thinking, web design and development">
      <div className={s.inner}>
        <div className={s.eyebrow}><span>One connected approach</span><span>From the first idea to what comes next.</span></div>
        <div className={s.words}>
          {disciplines.map((discipline, index) => (
            <div className={s.word} key={discipline.word} style={{ "--focus": `var(--focus-${index})` }}>
              <span className={index === 1 ? s.italic : undefined}>{discipline.word}</span>
              <p>{discipline.label}</p>
            </div>
          ))}
          <div className={s.bracket} aria-hidden="true"><i /><i /></div>
        </div>
        <div className={s.track} aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
