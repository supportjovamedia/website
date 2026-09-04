import Image from 'next/image';
import Link from 'next/link';
export default function Footer(){return <footer className="reference-footer">
 <div className="reference-footer-inner">
  <div className="reference-footer-brand"><Link href="/" className="reference-footer-logo"><Image src="/brand/jova-logo-white.png" alt="JovaMedia" width={754} height={390}/></Link><p>Strategy, creative, media and technology<br/>for ambitious businesses.</p><div className="reference-socials" aria-label="Social profiles not yet configured">{["LinkedIn","Instagram","X","YouTube"].map((name,i)=><button type="button" disabled key={name} aria-label={`${name} profile not configured`} title={`${name} profile not configured`}>{i===0?<b>in</b>:i===1?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".8"/></svg>:i===2?<span>𝕏</span>:<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor"/><path d="m10 9 6 3-6 3Z" fill="#070807"/></svg>}</button>)}</div></div>
  <nav className="reference-footer-links" aria-label="Footer navigation"><div><Link href="/">Home</Link><Link href="/services">Services</Link><Link href="/work">Work</Link></div><div><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link></div></nav>
  <div className="reference-footer-bottom"><div>London, UK<br/><a href="mailto:support@jovamedia.com">support@jovamedia.com</a></div><div>© {new Date().getFullYear()} JovaMedia<br/>All rights reserved.</div></div>
 </div>
 </footer>}
