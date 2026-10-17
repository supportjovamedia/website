"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import ConsultationLink from "./ConsultationLink";
import styles from "./DaybreakHero.module.css";
import { WhatsAppIcon } from "./BusinessContact";
import { whatsappLink } from "@/lib/business-contact.mjs";

const LivePreview=dynamic(()=>import("./DaybreakPreview"),{ssr:false});

export default function DaybreakHero(){
 const [live,setLive]=useState(false);
 const [ready,setReady]=useState(false);
 const onReady=useCallback(()=>setReady(true),[]);
 useEffect(()=>{
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  let disposed=false,idle=0;
  const cancel=()=>{if("cancelIdleCallback" in window)cancelIdleCallback(idle);else clearTimeout(idle);};
  const schedule=()=>{
   cancel();
   if(disposed||reduced.matches)return;
   const start=()=>{if(!disposed&&!reduced.matches)setLive(true);};
   idle="requestIdleCallback" in window?requestIdleCallback(start,{timeout:2000}):setTimeout(start,1000);
  };
  const change=()=>{
   if(reduced.matches){cancel();setLive(false);setReady(false);}
   else if(document.readyState==="complete")schedule();
  };
  if(document.readyState==="complete")schedule();
  else window.addEventListener("load",schedule,{once:true});
  reduced.addEventListener("change",change);
  return()=>{disposed=true;cancel();window.removeEventListener("load",schedule);reduced.removeEventListener("change",change);};
 },[]);
 return <section className={styles.root} aria-labelledby="home-title"><div className="shell"><div className="hero"><div className="message"><h1 id="home-title">Website design<br/><span>for small businesses.</span></h1><p className="description">Beautiful, custom-built websites designed around your business.</p><p className="previewPromise">Your personalised homepage preview <strong>in 48 hours.</strong> No commitment.</p><div className="actions"><ConsultationLink className="primary" placement="hero">free website preview</ConsultationLink><a className="secondary whatsappAction" href={whatsappLink("hero")} target="_blank" rel="noopener noreferrer" data-contact-placement="hero"><WhatsAppIcon />Chat on WhatsApp</a></div><p className="coverage">London-based. Working across the UK.</p></div><div className="previewWrap"><div className="showcase" role="img" aria-label="Daybreak coffee website design concept shown on desktop and phone screens" data-live-preview={ready?"ready":"still"}>
  <picture className="previewStill"><source media="(max-width:800px)" srcSet="/hero-daybreak/preview-phone.webp"/><Image src="/hero-daybreak/preview-desktop.webp" alt="" fill sizes="(max-width:800px) 90vw, 58vw" loading="eager" fetchPriority="high"/></picture>
  {live&&<LivePreview onReady={onReady}/>}
 </div></div></div></div></section>;
}
