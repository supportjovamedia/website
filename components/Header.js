'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const links=[['Home','/'],['Services','/services'],['Work','/work'],['About','/about'],['Contact','/contact']];
export default function Header(){
 const pathname=usePathname(); const [open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[pathname]);
 useEffect(()=>{const close=()=>setOpen(false); window.addEventListener('scroll',close,{passive:true}); return()=>window.removeEventListener('scroll',close)},[]);
 useEffect(()=>{document.body.style.overflow=open?'hidden':''; const key=e=>e.key==='Escape'&&setOpen(false); window.addEventListener('keydown',key); return()=>{document.body.style.overflow='';window.removeEventListener('keydown',key)}},[open]);
 const active=href=>href==='/'?pathname==='/':pathname===href||pathname.startsWith(`${href}/`);
 return <><a className="skip-link" href="#main-content">Skip to content</a><header className="header"><div className="shell nav"><Link href="/" className="brand-logo" aria-label="JovaMedia home"><Image src="/brand/jova-logo.png" alt="JovaMedia" width={754} height={390} priority/></Link><nav className="desktop-nav" aria-label="Primary navigation">{links.map(([label,href])=><Link key={href} href={href} className={active(href)?'active':''}>{label}</Link>)}</nav><div className="nav-actions"><Link href="/contact" className="btn small desktop-cta">Start a project</Link><button className="menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open?'Close menu':'Open menu'} onClick={()=>setOpen(v=>!v)}><span></span><span></span></button></div></div>{open&&<button className="menu-backdrop" aria-label="Close menu" onClick={()=>setOpen(false)}/>}<div id="mobile-menu" className={`mobile-menu ${open?'open':''}`} aria-hidden={!open}><nav className="mobile-menu-inner" aria-label="Mobile navigation">{links.map(([label,href])=><Link onClick={()=>setOpen(false)} key={href} href={href} className={active(href)?'active':''}>{label}</Link>)}<Link onClick={()=>setOpen(false)} href="/contact" className="btn mobile-project">Start a project →</Link></nav></div></header></>;
}
