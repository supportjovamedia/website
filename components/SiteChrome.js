"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import commerce from "./Commerce.module.css";
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
      root.current.querySelectorAll('main section > .shell > header, main section > .shell > h2, [data-site-reveal], [data-route-reveal]').forEach((el, index) => {
        if (el.closest('[data-motion-card]') || el.closest('[data-story-card]')) return;
        el.classList.add('route-reveal');
        el.style.setProperty('--reveal-delay', `${index % 3 * 40}ms`);
        if (el.getBoundingClientRect().top > innerHeight * .95) { el.classList.add('route-pending'); observer.observe(el); }
      });
    };
    setup(); media.addEventListener('change',setup);
    return () => { cleanup(); media.removeEventListener('change',setup); };
  }, [pathname,isHome]);
  if (pathname.startsWith("/preview/booking")) return <>{children}</>;
  const navigation = <div className={`jova-pages jova-header-chrome${isHome ? ' jova-home-header' : ''}`}>{header}</div>;
  if (isHome) return <>{navigation}<div className="site-motion-home" ref={root}>{children}</div></>;
  if (pathname === "/get-a-quote") return <>{navigation}<div className="jova-pages" ref={root}>{children}</div></>;
  return <>{navigation}<div className={`jova-pages${pathname === "/basket" ? ` ${commerce.basketChrome}` : ""}`} ref={root}>{children}{footer}</div></>;
}
