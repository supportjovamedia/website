"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
export default function SiteChrome({children, header, footer}) {
  const pathname = usePathname();
  const root = useRef(null);
  const isHome = pathname === "/";
  useEffect(() => {
    if (!root.current) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let observer;
    const cleanup = () => { observer?.disconnect(); root.current?.querySelectorAll('.route-pending').forEach(el => el.classList.remove('route-pending')); };
    const setup = () => {
      cleanup(); if (media.matches) return;
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.remove('route-pending'); observer.unobserve(entry.target); }
      }), {threshold: .06});
      // Measure the unchanged layout first. Interleaving each class write with
      // the next measurement forces a full style/layout pass per heading.
      const targets = [...root.current.querySelectorAll('main section > .shell > header, main section > .shell > h2, [data-site-reveal], [data-route-reveal]')]
        .filter(el => !el.closest('[data-motion-card]') && !el.closest('[data-story-card]'));
      const positions = targets.map(el => el.getBoundingClientRect().top);
      targets.forEach((el, index) => {
        el.classList.add('route-reveal');
        el.style.setProperty('--reveal-delay', `${index % 3 * 40}ms`);
        if (positions[index] > innerHeight * .95) { el.classList.add('route-pending'); observer.observe(el); }
      });
    };
    setup(); media.addEventListener('change',setup);
    return () => { cleanup(); media.removeEventListener('change',setup); };
  }, [pathname,isHome]);
  const navigation = <div className={`jova-pages jova-header-chrome${isHome ? ' jova-home-header' : ''}`}>{header}</div>;
  if (isHome) return <>{navigation}<div className="site-motion-home" ref={root}>{children}</div></>;
  if (pathname === "/get-a-quote") return <>{navigation}<div className="jova-pages" ref={root}>{children}</div></>;
  return <>{navigation}<div className={`jova-pages${pathname === "/basket" ? " basket-chrome" : ""}`} ref={root}>{children}{footer}</div></>;
}
