"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import MotionRegion from "./MotionRegion";
import WebsiteProducts from "./WebsiteProducts";
import EssentialOffer from "@/app/jovabook/EssentialOffer";
import booking from "@/app/jovabook/story.module.css";
import { products, productCategories, formatPrice } from "@/lib/products.mjs";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import s from "./ProductPackages.module.css";

const bookingCategories=[{id:"jovabook",name:"JovaBook",description:"A booking system for service businesses. Choose monthly or save 20% with annual billing."},...productCategories.map(item=>item.id==="subscriptions"?{...item,name:"Webcare"}:item)];

export default function ProductPackages({ homepage = false, includeJovaBook = false }) {
  const categories=includeJovaBook?bookingCategories:productCategories;
  const root = useRef(null);
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const category = categories.find(item => item.id === categoryId);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      trackEvent("view_item_list", { placement: homepage ? "home_packages" : "pricing", product_ids: products.filter(product => product.category === categoryId).map(product => product.id) });
      observer.disconnect();
    }, { threshold: .15 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [homepage, categoryId]);
  return <section className={s.packages} id="website-packages" ref={root} aria-labelledby="packages-heading">
    <div className={s.container}>
      <h2 id="packages-heading" className={s.screenReader}>Browse products</h2>
      <div className={s.catalogueLayout}>
      <nav className={s.categoryNav} aria-label="Product categories"><p>Categories</p>{categories.map(item => <button type="button" key={item.id} aria-pressed={item.id === categoryId} onClick={() => setCategoryId(item.id)}><span>{item.name}</span></button>)}</nav>
      <section className={s.categorySection} key={category.id} id={category.id} aria-labelledby={category.id + "-heading"}>
        <header className={s.categoryHeading}><h2 id={category.id + "-heading"}>{categoryId === "websites" ? "Made for what you need." : category.name}</h2><p>{categoryId === "websites" ? "A focused page, a business website or a complete booking system." : category.description}</p></header>
        {categoryId === "jovabook" ? <div className={`${booking.page} ${s.bookingOffer}`}><EssentialOffer/></div> : categoryId === "websites" ? <WebsiteProducts homepage={homepage} /> : <MotionRegion className={`${s.grid} ${s.careGrid}`}>{products.filter(product => product.category === category.id).map((product, index) => {
          return <article key={product.id} className={s.card} data-motion-card style={{ "--card-delay": `${index * 100}ms` }}>

            <h3>{product.name}</h3>
            <p className={s.description}>{product.description}</p>
            <p className={s.price}>{!product.interval && <small className={s.fromPrice}>From </small>}{formatPrice(product.amount)}{product.interval && <small> / month</small>}<span>{product.interval ? "Monthly website care" : "One-off project"}</span></p>
            <ul className={s.productFeatures} aria-label={`${product.name} features`}>{product.includes.map(item => <li key={item}>{item}</li>)}</ul>
            <Link href={`/get-a-quote?product=${product.id}`} className={s.button} aria-label={`Get a Quote for ${product.name}`} onClick={() => trackEvent("quote_click", { product_id: product.id, placement: homepage ? "home_packages" : "pricing" })}>Get a Quote</Link>
          </article>;
        })}</MotionRegion>}
        {categoryId !== "jovabook" && <p className={s.packageFootnote}>{categoryId === "websites" ? "Website prices start from the stated amount. Your scope and any separate costs are agreed before work begins." : "One care plan per website. Extra work is agreed separately."}</p>}
      </section>
      </div>
    </div>
  </section>;
}
