"use client";

import { useEffect, useRef } from "react";

export default function PhotoHeroMotion() {
  const marker = useRef(null);
  useEffect(() => {
    let disposed = false;
    let media;
    async function setup() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"), import("gsap/ScrollTrigger"),
      ]);
      if (disposed || !marker.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const hero = marker.current.closest("[data-photo-hero]");
      const backdrop = hero.querySelector("[data-hero-backdrop]");
      media = gsap.matchMedia();
      media.add("(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(backdrop, { y: 0 }, {
          y: () => Math.min(160, hero.offsetHeight * 0.22),
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "clamp(top top)",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      });
    }
    setup();
    return () => { disposed = true; media?.revert(); };
  }, []);
  return <span ref={marker} hidden aria-hidden="true" />;
}
