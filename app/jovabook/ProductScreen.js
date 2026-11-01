"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import s from "./jovabook.module.css";

export default function ProductScreen({name,alt,label,width,height,priority=false,className,caption=true}) {
  const dialog = useRef(null);
  const titleId = useId();
  const [open,setOpen] = useState(false);
  const src = `/jovabook/${name}.webp`;
  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = previous; };
  }, [open]);
  function show() { dialog.current.showModal(); setOpen(true); }
  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const targets = [...dialog.current.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')];
    const first = targets[0], last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <>
    <button className={`${s.screenOpen} ${caption ? s.screenWithCaption : ""}`} type="button" onClick={show} aria-label={`View ${label} full size`}>
      <span className={s.screenImage}><Image className={className} src={src} alt={alt} width={width} height={height} unoptimized priority={priority} /></span>
      {caption && <span className={s.screenCaption}>View {label} full size<span aria-hidden="true">+</span></span>}
    </button>
    <dialog ref={dialog} className={s.screenDialog} style={{"--screen-width":name === "booking-mobile" ? "440px" : "1520px","--screen-detail-width":name === "booking-mobile" ? "375px" : "1440px"}} aria-labelledby={titleId} onKeyDown={keepFocus} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) dialog.current.close(); }}>
      <div className={s.screenDialogHeader}><h2 id={titleId}>{label}</h2><div><a href={src} target="_blank" rel="noopener noreferrer">Open original image</a><button type="button" onClick={() => dialog.current.close()} autoFocus>Close</button></div></div>
      {open && <div className={s.screenDialogImage} tabIndex={0} role="region" aria-label={`${label} image, scroll to explore`}><Image src={src} alt={alt} width={width} height={height} unoptimized /></div>}
    </dialog>
  </>;
}
