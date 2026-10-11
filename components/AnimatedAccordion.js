"use client";

import { useEffect, useRef } from "react";

// Keep native disclosures for keyboard and no-JavaScript use. Once hydrated,
// coordinate height animations so native exclusivity cannot snap a row shut.
export default function AnimatedAccordion({ children }) {
  const root = useRef(null);

  useEffect(() => {
    const group = root.current;
    const rows = [...group.querySelectorAll("details")];
    const names = rows.map(row => row.getAttribute("name"));
    rows.forEach(row => row.removeAttribute("name"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let wanted = rows.find(row => row.open) || null;
    let disposed = false;
    const animations = new Map();

    async function transition(row, opening) {
      const start = row.getBoundingClientRect().height;
      animations.get(row)?.cancel();
      animations.delete(row);
      if (opening) row.open = true;
      const style = getComputedStyle(row);
      const closedHeight = row.querySelector("summary").getBoundingClientRect().height
        + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
        + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const end = opening ? row.getBoundingClientRect().height : closedHeight;
      let animation;
      if (!reducedMotion.matches && row.animate && Math.abs(start - end) > 0.5) {
        row.style.overflow = "hidden";
        row.style.willChange = "height";
        animation = row.animate([{ height: `${start}px` }, { height: `${end}px` }], {
          duration: 250,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        });
        animations.set(row, animation);
        try { await animation.finished; } catch { /* Unmounted during motion. */ }
        // A newer click may already be animating this row in the other direction.
        if (animations.get(row) !== animation) return;
      }
      if (disposed) return;
      row.open = opening;
      animation?.cancel();
      animations.delete(row);
      row.style.removeProperty("overflow");
      row.style.removeProperty("will-change");
    }

    function onClick(event) {
      const summary = event.target.closest("summary");
      if (!summary || !group.contains(summary)) return;
      event.preventDefault();
      const row = summary.parentElement;
      wanted = wanted === row ? null : row;
      // Start both directions in this frame, so the surrounding content moves once.
      rows.forEach(item => {
        if (item.open || item === wanted) void transition(item, item === wanted);
      });
    }
    group.addEventListener("click", onClick);
    return () => {
      disposed = true;
      animations.forEach(animation => animation.cancel());
      animations.clear();
      group.removeEventListener("click", onClick);
      rows.forEach((row, index) => {
        row.style.removeProperty("overflow");
        row.style.removeProperty("will-change");
        if (names[index]) row.setAttribute("name", names[index]);
      });
    };
  }, []);

  return <div ref={root} data-accordion>{children}</div>;
}
