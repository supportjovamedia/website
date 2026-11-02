"use client";

import { useEffect, useRef } from "react";

export default function StoryMotion({ children }) {
  const root = useRef(null);
  useEffect(() => {
    let disposed = false, media, context, frame = 0;
    const node = root.current;
    const cleanups = [];
    // Long smooth jumps can be interrupted by ScrollTrigger refreshing images.
    // Keep the real anchor destination and land there immediately, including
    // keyboard focus, rather than leaving visitors halfway through the page.
    const jumpToSection = event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href^="#"]');
      const target = link && document.getElementById(link.hash.slice(1));
      if (!target || !node.contains(target)) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, "", link.hash);
      target.scrollIntoView({ behavior: "instant", block: "start" });
      const heading = target.querySelector("h2,h3") || target;
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    };
    node.addEventListener("click", jumpToSection);
    cleanups.push(() => node.removeEventListener("click", jumpToSection));
    async function prepare() {
      const [engine, plugin] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed) return;
      const gsap = engine.gsap || engine.default;
      const ScrollTrigger = plugin.ScrollTrigger || plugin.default;
      gsap.registerPlugin(ScrollTrigger);
      context = gsap.context(() => {
        media = gsap.matchMedia();
        media.add({ reduced: "(prefers-reduced-motion: reduce)", desktop: "(min-width: 901px) and (hover: hover) and (pointer: fine)", all: "all" }, ({ conditions }) => {
          node.dataset.motion = conditions.reduced ? "reduced" : "active";
          if (conditions.reduced) return;
          node.querySelectorAll("[data-story-row]").forEach(row => {
            const items = [row.querySelector("[data-story-copy]"), row.querySelector("[data-story-visual]")].filter(Boolean);
            gsap.fromTo(items, { x: index => index === 0 ? 20 : -28, y: 12, opacity: .25 }, {
              x: 0, y: 0, opacity: 1, duration: .72, stagger: .09, ease: "power2.out", clearProps: "opacity,transform",
              scrollTrigger: { trigger: row, start: "top 88%", once: true },
            });
            if (conditions.desktop) {
              const stage = row.querySelector("[data-story-drift]");
              if (stage) gsap.fromTo(stage, { y: 16 }, { y: -16, ease: "none", scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: .65 } });
            }
          });
          node.querySelectorAll("[data-card-group]").forEach(group => {
            gsap.fromTo(group.querySelectorAll("[data-story-card]"), { y: 24, opacity: .25 }, {
              y: 0, opacity: 1, duration: .65, stagger: .09, ease: "power2.out", clearProps: "opacity,transform",
              scrollTrigger: { trigger: group, start: "top 90%", once: true },
            });
          });
        });
      }, node);
      const refresh = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (!disposed) ScrollTrigger.refresh(); }); };
      node.querySelectorAll("img").forEach(image => {
        if (!image.complete) { image.addEventListener("load", refresh, { once: true }); cleanups.push(() => image.removeEventListener("load", refresh)); }
      });
      document.fonts?.ready.then(refresh);
      refresh();
    }
    prepare().catch(() => { if (!disposed) node.dataset.motion = "static"; });
    return () => { disposed = true; cancelAnimationFrame(frame); cleanups.forEach(clean => clean()); media?.revert(); context?.revert(); };
  }, []);
  return <div ref={root} data-jovabook-story>{children}</div>;
}
