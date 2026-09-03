import Link from "next/link";
import Image from "next/image";
import { navLinks, footerLegalLinks, siteConfig } from "@/lib/data";

const socialLinks = [
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "x", label: "X (Twitter)" },
  { key: "facebook", label: "Facebook" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-navy/10 bg-navy text-ivory">
      <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/jova-icon.png"
                alt={siteConfig.name}
                width={36}
                height={36}
                className="h-8 w-8"
              />
              <span className="font-serif-brand text-xl tracking-wide text-ivory">
                JOVA <span className="text-xs font-sans font-medium tracking-[0.3em] text-gold align-middle">MEDIA</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/70">
              {siteConfig.description}
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((s) => (
                <a
                  key={s.key}
                  href={siteConfig.social[s.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ivory/20 text-xs text-ivory/80 transition-colors hover:border-gold hover:text-gold"
                >
                  {s.label.slice(0, 1)}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Navigate
            </h3>
            <ul className="mt-4 space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ivory/75 transition-colors hover:text-ivory"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Get in touch
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ivory/75">
              <li>
                <a href={`mailto:${siteConfig.email}`} className="hover:text-ivory">
                  {siteConfig.email}
                </a>
              </li>
              <li>
                <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="hover:text-ivory">
                  {siteConfig.phone}
                </a>
              </li>
              <li className="text-ivory/60">{siteConfig.address}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-ivory/10 pt-6 text-xs text-ivory/60 sm:flex-row">
          <p>
            &copy; {year} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex gap-6">
            {footerLegalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-ivory">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
