import Image from "next/image";
import Link from "next/link";
import CookieConsent from "./CookieConsent";
import styles from "./Footer.module.css";
import { businessPhone, whatsappLink } from "@/lib/business-contact.mjs";
export default function Footer(){return <footer className={`jova-footer ${styles.footer}`}>
 <Link href="/" aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={361} height={128}/></Link>
 <div><h3>Studio</h3><Link href="/about">Our story</Link><Link href="/work">Our work</Link><Link href="/services">Digital services</Link><Link href="/insights">Insights & guides</Link></div>
 <div><h3>Websites</h3><Link href="/websites">Explore websites</Link><Link href="/websites/business-websites">Business websites</Link><Link href="/websites/ecommerce-websites">Ecommerce</Link><Link href="/websites/booking-systems">Booking systems</Link><Link href="/get-a-quote">Get a Quote</Link></div>
 <div><h3>Contact</h3><a href="mailto:support.jovamedia@gmail.com">support.jovamedia@gmail.com</a><a href={businessPhone.tel}>{businessPhone.display}</a><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><CookieConsent/></div>
 <p>© {new Date().getFullYear()} JovaMedia<br/>Distinctive digital experiences.</p>
 </footer>}
