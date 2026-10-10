"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, ArrowUpRight } from "lucide-react";
import { products, formatPrice, taxNote } from "@/lib/products.mjs";
import { useBasket, addToBasket } from "@/lib/basket-store";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import ConsultationLink from "./ConsultationLink";
import s from "./Commerce.module.css";

const readySubscribe = () => () => {};
export default function ProductPackages({ homepage = false }) {
  const ready = useSyncExternalStore(readySubscribe, () => true, () => false);
  const ids = useBasket();
  const root = useRef(null);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      trackEvent("view_item_list", { placement: homepage ? "home_packages" : "pricing", product_ids: products.map(product => product.id) });
      observer.disconnect();
    }, { threshold: .15 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [homepage]);
  function add(product) {
    addToBasket(product.id);
    trackEvent("add_to_cart", { product_id: product.id, value: product.amount === null ? undefined : product.amount / 100 });
    setAnnouncement(`${product.name} added to your basket.`);
  }
  return <section className={s.packages} ref={root} aria-labelledby="packages-heading">
    <div className={s.container}>
      <h2 id="packages-heading" className={s.screenReader}>Compare website packages</h2>
      <div className={s.grid}>{products.map(product => <article key={product.id} className={s.card}>
        <div className={s.cardTop}><p className={s.eyebrow}>{product.eyebrow}</p></div>
        <h3>{product.name}</h3><p className={s.description}>{product.description}</p>
        <p className={s.price}>{formatPrice(product.amount)}<span>{product.amount === null ? "Final price confirmed before payment" : "One-off payment"}</span></p>
        {ids.includes(product.id) ? <Link href="/basket" className={s.button}>In basket · View basket <ArrowUpRight size={18} aria-hidden="true" /></Link> : <button type="button" disabled={!ready} className={s.button} onClick={() => add(product)}>Add to basket <ArrowUpRight size={18} aria-hidden="true" /></button>}
        <p className={s.includesTitle}>What’s included</p>
        <ul>{product.includes.map(item => <li key={item}><Check size={17} aria-hidden="true" /><span>{item}</span></li>)}</ul>
        <p className={s.cardNote}>{product.note}</p>
      </article>)}</div>
      <p role="status" className={s.announcement}>{announcement}</p>
      <div className={s.packageFootnote}><p>{taxNote} Hosting, domain names, paid software and third-party subscriptions are separate. Copy and images are supplied by you. We confirm the brief, timescale and revision allowance before accepting an order.</p><ConsultationLink className={s.textLink} placement={homepage ? "home_packages" : "pricing"}>Not sure? Get a free consultation <ArrowUpRight size={18} aria-hidden="true" /></ConsultationLink></div>
    </div>
  </section>;
}
