"use client";

import { useEffect, useRef } from "react";

// Content is visible before hydration and when motion is disabled.
export default function MotionRegion({ children, className, style, enterOnly = false }) {
  const root = useRef(null);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine)");
    let observer, frame = 0;
    const visible = new Set();
    const paint = () => {
      frame = 0;
      const positions = [...visible].map(card => {
        const rect = card.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
        return [card, progress];
      });
      positions.forEach(([card, progress]) => {
        card.style.setProperty("--motion-drift", `${(progress - .5) * 48}px`);
        card.style.setProperty("--motion-progress", progress);
      });
    };
    const request = () => { if (!frame && !enterOnly && !media.matches && desktop.matches) frame = requestAnimationFrame(paint); };
    const setup = () => {
      observer?.disconnect();
      cancelAnimationFrame(frame); frame = 0;
      removeEventListener("scroll", request);
      visible.clear();
      const cards = root.current.querySelectorAll("[data-motion-card]");
      cards.forEach(card => {
        delete card.dataset.revealed; delete card.dataset.inView; delete card.dataset.motionReady;
        card.style.removeProperty("--motion-drift"); card.style.removeProperty("--motion-progress");
      });
      if (media.matches) return;
      cards.forEach(card => {
        card.dataset.motionReady = "true";
        if (card.getBoundingClientRect().top < innerHeight * .85) card.dataset.revealed = "true";
      });
      observer = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting }) => {
          target.dataset.inView = String(isIntersecting);
          if (isIntersecting) {
            target.dataset.revealed = "true";
            if (desktop.matches && !enterOnly) visible.add(target);
            else observer.unobserve(target);
          }
          else visible.delete(target);
        });
        request();
      }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
      cards.forEach(card => observer.observe(card));
      if (desktop.matches && !enterOnly) addEventListener("scroll", request, { passive: true });
    };
    setup();
    media.addEventListener("change", setup);
    desktop.addEventListener("change", setup);
    addEventListener("resize", request);
    return () => {
      observer?.disconnect(); cancelAnimationFrame(frame); media.removeEventListener("change", setup);
      desktop.removeEventListener("change", setup);
      removeEventListener("scroll", request); removeEventListener("resize", request);
    };
  }, [enterOnly]);
  return <div className={className} style={style} ref={root}>{children}</div>;
}
