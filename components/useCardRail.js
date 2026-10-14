"use client";

import { useEffect, useRef, useState } from "react";

export default function useCardRail() {
  const rail = useRef(null);
  const cards = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const node = rail.current;
    let frame = 0;
    let stops = [];
    const update = () => {
      frame = 0;
      if (!stops.length) return;
      const distances = stops.map(stop => Math.abs(stop - node.scrollLeft));
      setActive(distances.indexOf(Math.min(...distances)));
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    node.addEventListener("scroll", request, { passive: true });
    const resize = new ResizeObserver(() => {
      const first = cards.current[0].offsetLeft;
      stops = cards.current.map(card => card.offsetLeft - first);
      request();
    });
    resize.observe(node);
    return () => { cancelAnimationFrame(frame); node.removeEventListener("scroll", request); resize.disconnect(); };
  }, []);

  function select(index) {
    rail.current.scrollTo({
      left: cards.current[index].offsetLeft - cards.current[0].offsetLeft,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  function registerCard(index, node) { cards.current[index] = node; }
  return { rail, registerCard, active, select };
}
