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
    let disposed = false;
    const update = () => {
      frame = 0;
      if (disposed || !node.isConnected || !stops.length) return;
      const distances = stops.map(stop => Math.abs(stop - node.scrollLeft));
      setActive(distances.indexOf(Math.min(...distances)));
    };
    const request = () => { if (!disposed && !frame) frame = requestAnimationFrame(update); };
    node.addEventListener("scroll", request, { passive: true });
    const resize = new ResizeObserver(() => {
      if (disposed || !node.isConnected) return;
      const current = cards.current.filter(card => card?.isConnected);
      if (!current.length) return;
      const first = current[0].offsetLeft;
      stops = current.map(card => card.offsetLeft - first);
      request();
    });
    resize.observe(node);
    return () => { disposed = true; cancelAnimationFrame(frame); node.removeEventListener("scroll", request); resize.disconnect(); };
  }, []);

  function select(index) {
    const node = rail.current, card = cards.current[index], first = cards.current[0];
    if (!node || !card || !first) return;
    node.scrollTo({
      left: card.offsetLeft - first.offsetLeft,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  function registerCard(index, node) { cards.current[index] = node; }
  return { rail, registerCard, active, select };
}
