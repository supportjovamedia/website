"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
export default function SiteChrome({children, header, footer}) {
  const pathname = usePathname();
  const root = useRef(null);
  const isHome = pathname === "/";
  useEffect(() => {
    if (isHome || !root.current) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let observer;
    const cleanup = () => { observer?.disconnect(); root.current?.querySelectorAll('.route-pending').forEach(el => el.classList.remove('route-pending')); };
    const setup = () => {
      cleanup(); if (media.matches) return;
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.remove('route-pending'); observer.unobserve(entry.target); }
      }), {threshold: .06});
      root.current.querySelectorAll('main section > .shell, main article, [data-route-reveal]').forEach(el => {
        el.classList.add('route-reveal');
        if (el.getBoundingClientRect().top > innerHeight * .95) { el.classList.add('route-pending'); observer.observe(el); }
      });
    };
    setup(); media.addEventListener('change',setup);
    return () => { cleanup(); media.removeEventListener('change',setup); };
  }, [pathname,isHome]);
  if (isHome) return <><div className="jova-pages">{header}</div>{children}</>;
  return <div className="jova-pages" ref={root}>{header}{children}{footer}</div>;
}
