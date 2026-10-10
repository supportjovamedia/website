/* eslint-disable @next/next/no-html-link-for-pages -- Keep primary navigation browser-native across deployments and history restores. */
"use client";
import Image from "next/image";
/* Main navigation uses native links so an old client router or interrupted route fetch cannot swallow a click. */
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
const links = [
  ["Home", "/"],
  ["About", "/about"],
  ["Services", "/services"],
  ["Contact", "/contact"],
];
export default function Header() {
  const pathname = usePathname();
  return <Navigation key={pathname} pathname={pathname} />;
}
function Navigation({ pathname }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  const menu = useRef(null);
  const header = useRef(null);
  const slot = useRef(null);
  const measureNavigation = useRef(null);

  useEffect(() => {
    const main = document.querySelector('#main-content main');
    if (!main) return;
    // Full hero/intro sections take priority. Legal pages use their title intro,
    // rather than waiting until the entire document has passed the viewport.
    const title = main.querySelector('h1');
    const intro = main.querySelector('section[aria-labelledby="home-title"], .page-hero, .concept-heading, .drink-hero')
      || title?.nextElementSibling || title || main.firstElementChild;
    if (!intro) return;
    const element = header.current;
    const placeholder = slot.current;
    const previousMarker = intro.getAttribute('data-navigation-intro');
    intro.setAttribute('data-navigation-intro', '');
    const setSticky = pastIntro => {
      // An open menu must keep its close button on screen while the viewport
      // changes. Recheck the intro as soon as the menu closes.
      if (menu.current.hidden) element.dataset.stuck = String(pastIntro);
    };
    const measure = () => {
      const height = element.getBoundingClientRect().height;
      const pastIntro = intro.getBoundingClientRect().bottom <= 0;
      placeholder.style.setProperty('--navigation-height', `${height}px`);
      setSticky(pastIntro);
    };
    measureNavigation.current = measure;
    measure();
    const observer = new IntersectionObserver(entries => {
      setSticky(entries[0].boundingClientRect.bottom <= 0);
    }, { threshold: 0 });
    observer.observe(intro);
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    addEventListener('pageshow', measure);
    return () => {
      observer.disconnect();
      resize.disconnect();
      removeEventListener('pageshow', measure);
      measureNavigation.current = null;
      if (previousMarker === null) intro.removeAttribute('data-navigation-intro');
      else intro.setAttribute('data-navigation-intro', previousMarker);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width:901px)");
    const close = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);
  useEffect(() => {
    if (!open) { measureNavigation.current?.(); return; }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const content = document.getElementById("main-content");
    const footer = document.querySelector("footer");
    if (content) content.inert = true;
    if (footer) footer.inert = true;
    const key = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
      if (e.key === "Tab") {
        const nodes = [toggle.current, ...menu.current.querySelectorAll("a")];
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0].focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      if (content) content.inert = false;
      if (footer) footer.inert = false;
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  const active = (href) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  return (
    <div className="navigation-slot" ref={slot}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="header" ref={header}>
        <div className="shell nav">
          <a href="/" className="brand-logo" aria-label="JovaMedia home">
            <Image
              src="/brand/jova-logo.png"
              alt="JovaMedia"
              width={361}
              height={128}
              priority
              sizes="120px"
            />
          </a>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {links.map(([name, href]) => (
              <a
                key={href}
                href={href}
                className={active(href) ? "active" : ""}
                aria-current={active(href) ? "page" : undefined}
              >
                {name}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <a className="btn small desktop-cta" href="/contact">
              Let’s talk
            </a>
            <button
              ref={toggle}
              className="menu-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(!open)}
              type="button"
            >
              <span />
              <span />
            </button>
          </div>
        </div>
        <nav
          ref={menu}
          hidden={!open}
          inert={!open}
          id="mobile-menu"
          className="mobile-menu"
          aria-label="Mobile navigation"
        >
          <div className="mobile-menu-inner">
            {links.map(([name, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active(href) ? "page" : undefined}
              >
                {name}
              </a>
            ))}
            <a
              href="/contact"
              className="btn mobile-project"
              onClick={() => setOpen(false)}
            >
              Let’s talk
            </a>
          </div>
        </nav>
      </header>
    </div>
  );
}
