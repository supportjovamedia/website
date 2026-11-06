import Image from "next/image";
import Link from "next/link";
import CookieConsent from "./CookieConsent";
import styles from "./Footer.module.css";
import { whatsappLink } from "@/lib/business-contact.mjs";
import { footerSocialProfiles } from "@/lib/site";
import { bookingIndustries } from "@/lib/jovabook-industries.mjs";
import SocialIcon from "./SocialIcon";

const industryLabels = {
  "hair-salons": "Hair salons", "barbers": "Barbers", "nail-salons": "Nail salons",
  "spas": "Spas", "medical-spas": "Medical spas", "tanning-salons": "Tanning salons",
  "pilates-instructors": "Pilates", "mental-health-practitioners": "Mental health",
};
const groups = [
  { title: "Business software", industries: true, links: [
    ...bookingIndustries.filter(item => industryLabels[item.slug]).map(item => ({ label: industryLabels[item.slug], href: `/industries/${item.slug}` })),
    { label: "All industries", href: "/industries" },
  ] },
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
      <div className={styles.navigation}>
        {groups.map(group => <nav key={group.title} aria-label={`Footer ${group.title}`}><h3>{group.title}</h3><GroupLinks group={group}/></nav>)}
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
