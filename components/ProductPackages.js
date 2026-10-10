"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { products, productCategories, formatPrice } from "@/lib/products.mjs";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import ConsultationLink from "./ConsultationLink";
import s from "./Commerce.module.css";

export default function ProductPackages({ homepage = false }) {
  const root = useRef(null);
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
  return <section className={s.packages} ref={root} aria-labelledby="packages-heading">
    <div className={s.container}>
      <h2 id="packages-heading" className={s.screenReader}>Browse products</h2>
      <div className={s.catalogueLayout}>
      <nav className={s.categoryNav} aria-label="Product categories"><p>Categories</p>{productCategories.map(item => <button type="button" key={item.id} aria-pressed={item.id === categoryId} onClick={() => setCategoryId(item.id)}><span>{item.name}</span><span className={s.categoryCount}>{products.filter(product => product.category === item.id).length}</span></button>)}</nav>
      <section className={s.categorySection} key={category.id} id={category.id} aria-labelledby={category.id + "-heading"}>
        <header className={s.categoryHeading}><h2 id={category.id + "-heading"}>{category.name}</h2><p>{category.description}</p></header>
        <div className={s.grid}>{products.filter(product => product.category === category.id).map(product => {
          return <article key={product.id} className={s.card}>
            <div className={s.cardTop}><p className={s.eyebrow}>{product.eyebrow}</p></div>
            <h3>{product.name}</h3>
            <p className={s.price}>{!product.interval && <small className={s.fromPrice}>From </small>}{formatPrice(product.amount)}{product.interval && <small> / month</small>}<span>{product.interval ? "Monthly website care" : "One-off project"}</span></p>
            <ul className={s.productFeatures} aria-label={`${product.name} includes`}>{product.includes.map(item => <li key={item}><Check size={17} aria-hidden="true" /><span>{item}</span></li>)}</ul>
            <Link href={`/get-a-quote?product=${product.id}`} className={s.button} aria-label={`Get a Quote for ${product.name}`} onClick={() => trackEvent("quote_click", { product_id: product.id, placement: homepage ? "home_packages" : "pricing" })}>Get a Quote</Link>
            <div className={s.productTerms}><p className={s.cardNote}>{product.note}</p></div>
          </article>;
        })}</div>
      </section>
      </div>
      <div className={s.packageFootnote}><p>Website prices start from the stated amount and depend on the agreed scope. Hosting, domains and paid software are separate. You supply the copy and images. We confirm the brief, scope and platform compatibility before starting work. Care plans cover one website and the stated monthly allowance.</p><ConsultationLink className={s.textLink} placement={homepage ? "home_packages" : "pricing"} /></div>
    </div>
  </section>;
}
