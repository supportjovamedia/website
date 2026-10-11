"use client";

import Link from "next/link";
import MotionRegion from "./MotionRegion";
import { products, comparisonForProduct, formatPrice } from "@/lib/products.mjs";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
import s from "./WebsiteProducts.module.css";

const introductions = {
  "landing-page": "Give your service or product a dedicated home, designed to turn interest into enquiries.",
  "business-website": "A complete home for your business, with room to tell your story, showcase your work and bring in enquiries.",
  "booking-system": "Your business website, with a booking system you own and an admin panel you control.",
};
const quoteLabels = {
  "landing-page": "Get my landing page quote",
  "business-website": "Get my business website quote",
  "booking-system": "Get my booking website quote",
};

function productFeatures(product, booking = false) {
  let inBooking = false;
  return comparisonForProduct(product.id).filter(row => {
    if (row.bookingOnly) inBooking = true;
    return !row.heading && !!row.value && inBooking === booking;
  }).map(row => row.value === true ? row.label : row.value);
}

function Tick() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Features({ items, label }) {
  return <ul className={s.features} aria-label={label}>{items.map(item => <li key={item}><Tick /><span>{item}</span></li>)}</ul>;
}

function QuoteLink({ product, homepage }) {
  return <Link href={`/get-a-quote?product=${product.id}`} className={s.quote} aria-label={`Get a Quote for ${product.name}`} onClick={() => trackEvent("quote_click", { product_id: product.id, placement: homepage ? "home_packages" : "pricing" })}>{quoteLabels[product.id]}<span aria-hidden="true">↗</span></Link>;
}

function Price({ product }) {
  return <p className={s.price}><span>From</span><strong>{formatPrice(product.amount)}</strong><small>One-off build</small></p>;
}

export default function WebsiteProducts({ homepage = false }) {
  const websites = products.filter(product => product.category === "websites");
  return <div className={s.products}>
    <MotionRegion className={s.websiteGrid}>{websites.map((product, index) => <article className={`${s.websiteCard} ${product.id === "business-website" ? s.businessCard : ""}`} key={product.id} data-motion-card style={{ "--card-delay": `${index * 80}ms` }}>
      <div className={s.summary}><header className={s.productHeader}><p className={s.eyebrow}><span aria-hidden="true">0{index + 1} / </span>{product.eyebrow}</p><h3>{product.name}</h3><Price product={product} /></header>
      <p className={s.introduction}>{introductions[product.id]}</p>
      <QuoteLink product={product} homepage={homepage} /></div>
      <div className={s.details}>
      {product.id === "booking-system" && <section className={s.bookingExtras}><h4>Your booking system</h4><Features items={productFeatures(product, true)} label="Booking system features" /></section>}
      <section className={s.inclusions}><h4>{product.id === "booking-system" ? "Your complete website" : "Your website includes"}</h4><Features items={productFeatures(product)} label={`${product.name} features`} /></section>
      </div>
    </article>)}</MotionRegion>
  </div>;
}
