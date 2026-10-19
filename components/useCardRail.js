"use client";

import { useEffect, useRef, useState } from "react";

export default function useCardRail() {
  const rail = useRef(null);
  const cards = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    let frame = 0;
    let stops = [];
    let disposed = false;
    const update = () => {
      frame = 0;
      if (disposed || !node.isConnected || !stops.length) return;
      const distances = stops.map(stop => Math.abs(stop - node.scrollLeft));
      setActive(distances.indexOf(Math.min(...distances)));
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    node.addEventListener("scroll", request, { passive: true });
    const resize = new ResizeObserver(() => {
      if (disposed || !node.isConnected) return;
      // React clears callback refs during route changes. A queued observer must
      // ignore removed cards, including spare slots from a longer previous rail.
      const current = cards.current.filter(card => card && node.contains(card));
      if (!current.length) return;
      const first = current[0].offsetLeft;
      stops = current.map(card => card.offsetLeft - first);
      request();
    });
    resize.observe(node);
    return () => { disposed = true; cancelAnimationFrame(frame); node.removeEventListener("scroll", request); resize.disconnect(); };
  }, []);

  function select(index) {
    const node = rail.current;
    const current = cards.current.filter(card => card && node?.contains(card));
    if (!node || !current[index]) return;
    node.scrollTo({
      left: current[index].offsetLeft - current[0].offsetLeft,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  function registerCard(index, node) { cards.current[index] = node; }
  return { rail, registerCard, active, select };
}
