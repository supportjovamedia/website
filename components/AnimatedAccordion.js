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
    let busy = false;
    let disposed = false;
    let animation;

    async function transition(row, opening) {
      const start = row.getBoundingClientRect().height;
      if (opening) row.open = true;
      const style = getComputedStyle(row);
      const closedHeight = row.querySelector("summary").getBoundingClientRect().height
        + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
        + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const end = opening ? row.getBoundingClientRect().height : closedHeight;
      if (!reducedMotion.matches && row.animate) {
        row.style.overflow = "hidden";
        row.style.willChange = "height";
        animation = row.animate([{ height: `${start}px` }, { height: `${end}px` }], {
          duration: opening ? 250 : 170,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        });
        try { await animation.finished; } catch { /* Unmounted during motion. */ }
      }
      if (disposed) return;
      row.open = opening;
      animation?.cancel();
      animation = undefined;
      row.style.removeProperty("overflow");
      row.style.removeProperty("will-change");
    }

    async function settle() {
      if (busy) return;
      busy = true;
      while (!disposed) {
        const current = rows.find(row => row.open) || null;
        if (current === wanted) break;
        if (current) await transition(current, false);
        // Re-read the latest choice after closing, including rapid clicks.
        if (!disposed && wanted) await transition(wanted, true);
      }
      busy = false;
    }

    function onClick(event) {
      const summary = event.target.closest("summary");
      if (!summary || !group.contains(summary)) return;
      event.preventDefault();
      const row = summary.parentElement;
      wanted = wanted === row ? null : row;
      void settle();
    }
    group.addEventListener("click", onClick);
    return () => {
      disposed = true;
      animation?.cancel();
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
