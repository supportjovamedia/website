"use client";
import { useEffect } from "react";

// A narrow band at the viewport midpoint gives focus to one stable box at a time.
// No scroll listener or per-frame layout measurement is needed.
export default function useScrollFocus(root, selector) {
  useEffect(() => {
    const elements = [...root.current.querySelectorAll(selector)];
    let observer;
    const setup = () => {
      observer?.disconnect();
      const midpoint = Math.floor(innerHeight / 2);
      const bounds = elements.map(element => element.getBoundingClientRect());
      const focused = new Set(elements.filter((_, index) => bounds[index].top <= midpoint && bounds[index].bottom > midpoint));
      const paint = () => {
        const current = elements.find(element => focused.has(element));
        elements.forEach(element => { element.dataset.highlighted = String(element === current); });
      };
      paint();
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) focused.add(entry.target);
          else focused.delete(entry.target);
        });
        paint();
      }, { rootMargin: `-${midpoint}px 0px -${innerHeight - midpoint - 1}px 0px`, threshold: 0 });
      elements.forEach(element => observer.observe(element));
    };
    setup();
    addEventListener("resize", setup);
    addEventListener("pageshow", setup);
    return () => {
      observer?.disconnect();
      removeEventListener("resize", setup);
      removeEventListener("pageshow", setup);
    };
  }, [root, selector]);
}
