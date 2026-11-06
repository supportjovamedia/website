import Image from "next/image";
import Link from "next/link";
import CookieConsent from "./CookieConsent";
import styles from "./Footer.module.css";
import { whatsappLink } from "@/lib/business-contact.mjs";
import { footerSocialProfiles } from "@/lib/site";
import { bookingIndustries } from "@/lib/jovabook-industries.mjs";
import SocialIcon from "./SocialIcon";

const groups = [
  { title: "Business software", industries: true, links: bookingIndustries.map(item => ({ label: item.name, href: `/industries/${item.slug}` })) },
  { title: "JovaBook", links: [
    { label: "Plans & pricing", href: "/pricing" },
    { label: "Start now", href: "https://book.jovamedia.com/?portal=owner&plan=essential&cadence=monthly#signup" },
    { label: "Login", href: "https://book.jovamedia.com/login" },
    { label: "Referrals", href: "/#refer-a-business" },
  ] },
  { title: "Company", links: [
    { label: "About us", href: "/about" },
    { label: "Contact us", href: "/contact" },
    { label: "Blog", href: "/blog" },
  ] },
  { title: "Other products", links: [
    { label: "All products", href: "/products" },
    { label: "Get a Quote", href: "/get-a-quote" },
  ] },
];

function GroupLinks({ group }) {
  return <div className={`${styles.groupLinks} ${group.industries ? styles.industryLinks : ""}`}>
    {group.links.map(link => <Link key={link.href} prefetch={false} href={link.href}>{link.label}</Link>)}
  </div>;
}

export default function Footer() {
  return <footer className={`jova-footer ${styles.footer}`}>
    <div className={styles.inner}>
      <Link className={styles.brand} prefetch={false} href="/" aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128}/></Link>
      <div className={styles.desktopNavigation}>
        {groups.map(group => <nav key={group.title} aria-label={`Footer ${group.title}`}><h3>{group.title}</h3><GroupLinks group={group}/></nav>)}
      </div>
      <div className={styles.mobileNavigation}>
        {groups.map(group => <details key={group.title}>
          <summary>{group.title}<svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12" stroke="currentColor" strokeWidth="1.5"/><path className={styles.plusVertical} d="M9 3v12" stroke="currentColor" strokeWidth="1.5"/></svg></summary>
          <nav aria-label={`Footer ${group.title}`}><GroupLinks group={group}/></nav>
        </details>)}
      </div>
      <div className={styles.contactRow}>
        <div className={styles.contactLinks}><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></div>
        <nav className={styles.socials} aria-label="JovaMedia social profiles">{footerSocialProfiles.map(profile => <a key={profile.icon} href={profile.url} target="_blank" rel="noopener noreferrer me" aria-label={`JovaMedia on ${profile.label}`} title={profile.label}><SocialIcon name={profile.icon}/></a>)}<a href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label="Chat with JovaMedia on WhatsApp" title="WhatsApp" data-contact-placement="footer"><SocialIcon name="whatsapp"/></a></nav>
      </div>
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} JovaMedia</p>
        <nav className={styles.legal} aria-label="Legal and privacy"><Link prefetch={false} href="/privacy-policy">Privacy</Link><Link prefetch={false} href="/terms">Terms</Link><CookieConsent/></nav>
      </div>
    </div>
  </footer>;
}
