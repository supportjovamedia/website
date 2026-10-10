"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { products, productCategories, formatPrice, taxNote } from "@/lib/products.mjs";
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
  const [categoryId, setCategoryId] = useState(productCategories[0].id);
  const category = productCategories.find(item => item.id === categoryId);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      trackEvent("view_item_list", { placement: homepage ? "home_packages" : "pricing", product_ids: products.filter(product => product.category === categoryId).map(product => product.id) });
      observer.disconnect();
    }, { threshold: .15 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [homepage, categoryId]);
  function add(product) {
    if (product.interval && ids.some(id => products.find(item => item.id === id)?.interval && id !== product.id)) { setAnnouncement("Your basket already contains a care subscription. Remove it before choosing a different plan."); return; }
    addToBasket(product.id);
    trackEvent("add_to_cart", { product_id: product.id, value: product.amount === null ? undefined : product.amount / 100 });
    setAnnouncement(`${product.name} added to your basket.`);
  }
  return <section className={s.packages} ref={root} aria-labelledby="packages-heading">
    <div className={s.container}>
      <h2 id="packages-heading" className={s.screenReader}>Browse products</h2>
      <div className={s.catalogueLayout}>
      <nav className={s.categoryNav} aria-label="Product categories"><p>Categories</p>{productCategories.map(item => <button type="button" key={item.id} aria-pressed={item.id === categoryId} onClick={() => { setCategoryId(item.id); setAnnouncement(""); }}><span>{item.name}</span><span className={s.categoryCount}>{products.filter(product => product.category === item.id).length}</span></button>)}</nav>
      <section className={s.categorySection} key={category.id} id={category.id} aria-labelledby={category.id + "-heading"}>
        <header className={s.categoryHeading}><h2 id={category.id + "-heading"}>{category.name}</h2><p>{category.description}</p></header>
        <div className={s.grid}>{products.filter(product => product.category === category.id).map(product => {
          return <article key={product.id} className={s.card}>
            <div className={s.cardTop}><p className={s.eyebrow}>{product.eyebrow}</p></div>
            <h3>{product.name}</h3>
            <p className={s.price}>{formatPrice(product.amount)}{product.interval && <small> / month</small>}<span>{product.interval ? "Billed monthly. Renews until cancelled." : "One-off payment"}</span></p>
            <ul className={s.productFeatures} aria-label={`${product.name} includes`}>{product.includes.map(item => <li key={item}><Check size={17} aria-hidden="true" /><span>{item}</span></li>)}</ul>
            {ids.includes(product.id) ? <Link href="/basket" className={s.button}>In basket · View basket</Link> : <button type="button" disabled={!ready} className={s.button} onClick={() => add(product)}>Add to basket</button>}
            <div className={s.productTerms}><p className={s.cardNote}>{product.note}</p>{product.interval && <p className={s.cardNote}>Email support.jovamedia@gmail.com before your next renewal to cancel future billing.</p>}</div>
          </article>;
        })}</div>
      </section>
      </div>
      <p role="status" className={s.announcement}>{announcement}</p>
      <div className={s.packageFootnote}><p>{taxNote} Website prices cover the stated build. Hosting, domains and paid software are separate. You supply the copy and images. We confirm the brief and platform compatibility before accepting an order. Care subscriptions cover one website and the stated monthly allowance.</p><ConsultationLink className={s.textLink} placement={homepage ? "home_packages" : "pricing"}>Not sure? Get a free consultation</ConsultationLink></div>
    </div>
  </section>;
}
