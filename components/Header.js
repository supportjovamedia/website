"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
const links = [
  ["Home", "/"],
  ["Services", "/services"],
  ["Work", "/work"],
  ["About", "/about"],
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

  useEffect(() => {
    const mq = window.matchMedia("(min-width:901px)");
    const close = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);
  useEffect(() => {
    if (!open) return;
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
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="header">
        <div className="shell nav">
          <Link href="/" className="brand-logo" aria-label="JovaMedia home">
            <Image
              src="/brand/jova-logo.png"
              alt="JovaMedia"
              width={754}
              height={390}
              priority
              sizes="120px"
            />
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {links.map(([name, href]) => (
              <Link
                key={href}
                href={href}
                className={active(href) ? "active" : ""}
                aria-current={active(href) ? "page" : undefined}
              >
                {name}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <Link className="btn small desktop-cta" href="/contact">
              Start a project
            </Link>
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
              <span />
            </button>
          </div>
        </div>
        <nav
          ref={menu}
          hidden={!open}
          id="mobile-menu"
          className="mobile-menu"
          aria-label="Mobile navigation"
        >
          <div className="mobile-menu-inner">
            {links.map(([name, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active(href) ? "page" : undefined}
              >
                {name}
              </Link>
            ))}
            <Link
              href="/contact"
              className="btn mobile-project"
              onClick={() => setOpen(false)}
            >
              Start a project
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
