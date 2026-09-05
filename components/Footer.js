import Image from 'next/image';
import Link from 'next/link';
import {socialProfiles} from '@/lib/site';
function SocialIcon({name}){return <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">{name==='linkedin'?<><path d="M4 8h4v13H4zM10 8h4v2c1-3 7-3 7 3v8h-4v-7c0-3-3-3-3 0v7h-4z"/><circle cx="6" cy="4" r="2"/></>:name==='instagram'?<><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1"/></>:name==='tiktok'?<path d="M14 2h4c0 3 2 5 5 5v4c-2 0-4-1-5-2v8a6 6 0 1 1-6-6v4a2 2 0 1 0 2 2Z"/>:<path d="M3 3h5l5 7 6-7h2l-7 9 8 9h-5l-5-7-6 7H3l8-9Zm3 2 12 14h1L7 5Z"/>}</svg>}

export default function Footer(){return <footer className="reference-footer">
 <div className="reference-footer-inner">
  <div className="reference-footer-brand"><Link href="/" className="reference-footer-logo"><Image src="/brand/jova-logo-white.png" alt="JovaMedia" width={754} height={390}/></Link><p>Strategy, creative, media and technology<br/>for ambitious businesses.</p><div className="reference-socials">{socialProfiles.map(({label,icon,url})=><a key={icon} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}><SocialIcon name={icon}/><span>{label}</span></a>)}</div></div>
  <nav className="reference-footer-links" aria-label="Footer navigation"><div><Link href="/">Home</Link><Link href="/services">Services</Link><Link href="/work">Work</Link></div><div><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link></div></nav>
  <div className="reference-footer-bottom"><div>London, UK<br/><a href="mailto:support@jovamedia.com">support@jovamedia.com</a></div><div>© {new Date().getFullYear()} JovaMedia<br/>All rights reserved.</div></div>
 </div>
 </footer>}
