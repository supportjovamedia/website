"use client";

import { useEffect, useRef } from "react";

// Content is visible before hydration and when motion is disabled.
export default function MotionRegion({ children, className }) {
  const root = useRef(null);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let observer;
    const setup = () => {
      observer?.disconnect();
      const cards = root.current.querySelectorAll("[data-motion-card]");
      cards.forEach(card => { delete card.dataset.revealed; delete card.dataset.inView; });
      if (media.matches) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting }) => {
          target.dataset.inView = String(isIntersecting);
          if (isIntersecting) target.dataset.revealed = "true";
        });
      }, { threshold: .25, rootMargin: "0px 0px -5% 0px" });
      cards.forEach(card => observer.observe(card));
    };
    setup();
    media.addEventListener("change", setup);
    return () => { observer?.disconnect(); media.removeEventListener("change", setup); };
  }, []);
  return <div className={className} ref={root}>{children}</div>;
}
