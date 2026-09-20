"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import s from "./JovaChat.module.css";
export default function JovaChat(){
 const [open,setOpen]=useState(false),[ready,setReady]=useState(false),[status,setStatus]=useState("loading"),[chatOpen,setChatOpen]=useState(false);
 const launcher=useRef(null),panel=useRef(null);
 useEffect(()=>{
  const api=window.Tawk_API=window.Tawk_API||{};
  api.onLoad=()=>{api.hideWidget();setReady(true);setStatus(api.getStatus());};
  api.onStatusChange=value=>setStatus(value);
  api.onChatMaximized=()=>{setChatOpen(true);setOpen(false);};
  api.onChatMinimized=()=>{api.hideWidget();setChatOpen(false);launcher.current?.focus();};
  window.Tawk_LoadStart=new Date();
  let script=document.getElementById("jova-tawk-script");
  if(!script){script=document.createElement("script");script.id="jova-tawk-script";script.async=true;script.src="https://embed.tawk.to/6ab052920dfa023441abcf65/1k30c5374";script.charset="UTF-8";script.crossOrigin="anonymous";script.onerror=()=>setStatus("unavailable");document.body.appendChild(script);}
  return()=>{api.onLoad=undefined;api.onStatusChange=undefined;api.onChatMaximized=undefined;api.onChatMinimized=undefined;};
 },[]);
 useEffect(()=>{if(!open)return;panel.current?.focus();const close=event=>{if(event.key==="Escape"){setOpen(false);launcher.current?.focus();}};document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close);},[open]);
 function startChat(){const api=window.Tawk_API;if(ready&&api?.maximize){api.showWidget();api.maximize();}}
 return <aside className={s.chat} aria-label="Jova customer support">
 {open&&<section ref={panel} tabIndex={-1} id="jova-chat-panel" className={s.panel} aria-labelledby="jova-chat-title">
 <header><span className={s.logoWrap}><Image className={s.logo} src="/brand/jova-logo-white.png" alt="JovaMedia" width={112} height={40}/><Image className={s.logoLettering} src="/brand/jova-logo-white.png" alt="" aria-hidden="true" width={112} height={40}/></span><button className={s.close} onClick={()=>{setOpen(false);launcher.current?.focus();}} aria-label="Close support menu">×</button><h2 id="jova-chat-title">Got a question?</h2></header>
 <div className={s.body}><div className={s.availability}><i data-online={status==="online"}/><span>{status==="online"?"Our team is online":status==="away"?"Our team is away right now":ready?"Leave a message for our team":"Email us or use the contact form below"}</span></div>
 {ready&&<button className={s.primary} onClick={startChat}>{status==="online"?"Live chat":"Leave us a message"}<span aria-hidden="true">↗</span></button>}
 <Link className={s.projectLink} href="/contact" onClick={()=>setOpen(false)}>Let’s talk about your project</Link>
 <p className={s.note}>Messages go to the Jova team. <Link href="/privacy-policy">Privacy</Link></p></div>
 </section>}
 {!chatOpen&&<button ref={launcher} className={s.launcher} onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="jova-chat-panel" aria-label={open?"Close Jova support":"Talk to Jova"}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2V11.5a9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.5"/><path d="M7 10h8M7 14h5" stroke="currentColor" strokeWidth="1.5"/></svg><span>Talk to Jova</span></button>}
 </aside>
}
