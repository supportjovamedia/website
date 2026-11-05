import Image from "next/image";
import Link from "next/link";
import CookieConsent from "./CookieConsent";
import styles from "./Footer.module.css";
import { businessPhone, whatsappLink } from "@/lib/business-contact.mjs";
import { footerSocialProfiles } from "@/lib/site";
import SocialIcon from "./SocialIcon";
export default function Footer(){return <footer className={`jova-footer ${styles.footer}`}>
 <Link prefetch={false} href="/" aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128}/></Link>
 <div><h3>JovaBook</h3><Link prefetch={false} href="/">Booking software</Link><Link prefetch={false} href="/pricing">Plans &amp; pricing</Link><a href="https://book.jovamedia.com/?portal=owner&plan=essential&cadence=monthly#signup">Start now</a><a href="https://book.jovamedia.com/login">Login</a><Link prefetch={false} href="/blog">Blog &amp; guides</Link><Link prefetch={false} href="/industries">Booking by industry</Link></div>
 <div><h3>Other products</h3><Link prefetch={false} href="/products">All products</Link><Link prefetch={false} href="/products?category=websites">Website packages</Link><Link prefetch={false} href="/websites/business-websites">Business websites</Link><Link prefetch={false} href="/websites/landing-pages">Landing pages</Link><Link prefetch={false} href="/websites/booking-systems">Booking systems</Link><Link prefetch={false} href="/get-a-quote">Get a Quote</Link></div>
 <div><h3>Contact</h3><Link prefetch={false} href="/contact">Contact Us</Link><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a><a href={businessPhone.tel}>{businessPhone.display}</a><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a><Link prefetch={false} href="/privacy-policy">Privacy</Link><Link prefetch={false} href="/terms">Terms</Link><CookieConsent/></div>
 <div className={styles.bottom}><p>© {new Date().getFullYear()} JovaMedia<br/>Distinctive digital experiences.</p><nav className={styles.socials} aria-label="JovaMedia social profiles">{footerSocialProfiles.map(profile => <a key={profile.icon} href={profile.url} target="_blank" rel="noopener noreferrer me" aria-label={`JovaMedia on ${profile.label}`} title={profile.label}><SocialIcon name={profile.icon} /></a>)}<a href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label="Chat with JovaMedia on WhatsApp" title="WhatsApp" data-contact-placement="footer"><SocialIcon name="whatsapp" /></a></nav></div>
 </footer>}
