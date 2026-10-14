/* eslint-disable @next/next/no-html-link-for-pages -- Keep primary navigation browser-native across deployments and history restores. */
"use client";
import Image from "next/image";
/* Main navigation uses native links so an old client router or interrupted route fetch cannot swallow a click. */
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
const links = [
  ["Home", "/"],
  ["Services", "/services"],
  ["Our Work", "/work"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
  ["Contact Us", "/contact"],
];
const serviceLinks = [
  ["Website design", "/services/web-design"],
  ["Social media management", "/services/social-management"],
  ["Brand strategy and design", "/services/brand-strategy"],
  ["Content creation", "/services/content"],
  ["Email marketing", "/services/email-marketing"],
  ["Search engine visibility", "/services/seo"],
  ["Systems and automation", "/services/system-modernization"],
];
function MenuChevron({ back = false }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={back ? "m14 6-6 6 6 6" : "m9 6 6 6-6 6"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export default function Header() {
  const pathname = usePathname();
  return <Navigation key={pathname} pathname={pathname} />;
}
function Navigation({ pathname }) {
  const [open, setOpen] = useState(false);
  const [serviceMenu, setServiceMenu] = useState(false);
  const toggle = useRef(null);
  const menu = useRef(null);
  const header = useRef(null);
  const slot = useRef(null);
  const measureNavigation = useRef(null);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector(serviceMenu ? '.mobile-menu-back' : '.mobile-services-toggle')?.focus();
  }, [open, serviceMenu]);

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
      if (element.dataset.menuOpen !== 'true' && element.isConnected) element.dataset.stuck = String(pastIntro);
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
        const nodes = [toggle.current, ...menu.current.querySelectorAll("a, button")].filter(node => !node.closest('[inert]'));
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
  const closeMenu = () => { setOpen(false); setServiceMenu(false); };
  const showServices = () => {
    setServiceMenu(true);
  };
  const showMain = () => {
    setServiceMenu(false);
  };
  return (
    <div className="navigation-slot" ref={slot}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="header" ref={header} data-menu-open={open}>
        <div className="shell nav">
          <a href="/" className="brand-logo" aria-label="JovaMedia home">
            <Image
              className="logo-light-surface"
              src="/brand/jova-logo.png"
              alt="JovaMedia"
              width={361}
              height={128}
              priority
              sizes="120px"
            />
            <Image className="logo-dark-surface" src="/brand/jova-logo-white.png" alt="" aria-hidden="true" width={361} height={128} sizes="132px" loading="eager" />
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
            <a className="btn small desktop-cta" href="/get-a-quote">
              Get a Quote
            </a>
            <button
              ref={toggle}
              className="menu-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => open ? closeMenu() : setOpen(true)}
              type="button"
            >
              <span />
              <span />
            </button>
          </div>
        </div>
        <nav
          ref={menu}
          inert={!open}
          aria-hidden={!open}
          data-open={open}
          id="mobile-menu"
          className="mobile-menu"
          aria-label="Mobile navigation"
        >
          <div className="mobile-menu-inner">
            <div className="mobile-menu-page" data-active={!serviceMenu} inert={serviceMenu} aria-hidden={serviceMenu}>
            {links.map(([name, href]) => name === "Services" ? (
              <button key={href} type="button" className="mobile-services-toggle" onClick={showServices} aria-expanded={serviceMenu} aria-controls="mobile-services"><span>Services</span><MenuChevron /></button>
            ) : (
              <a
                key={href}
                href={href}
                onClick={closeMenu}
                aria-current={active(href) ? "page" : undefined}
              >
                {name}
              </a>
            ))}
            <a
              href="/get-a-quote"
              className="btn mobile-project"
              onClick={closeMenu}
            >
              Get a Quote
            </a>
            </div>
            <div id="mobile-services" className="mobile-menu-page mobile-services" data-active={serviceMenu} inert={!serviceMenu} aria-hidden={!serviceMenu}>
              <button type="button" className="mobile-menu-back" onClick={showMain}><MenuChevron back/><span>Back</span></button>
              <a className="mobile-services-overview" href="/services" onClick={closeMenu}>Explore our services</a>
              {serviceLinks.map(([name, href]) => <a key={href} href={href} onClick={closeMenu} aria-current={active(href) ? "page" : undefined}>{name}</a>)}
            </div>
          </div>
        </nav>
      </header>
    </div>
  );
}
