"use client";
import Image from "next/image";
import Link from "next/link";
import {useState} from "react";
import {products,formatPrice} from "@/lib/products.mjs";
import {serviceArt,serviceArtAlt} from "@/lib/service-art";
import s from "./products.module.css";
const categories=[{id:"products",name:"Products"},{id:"websites",name:"Websites"},{id:"services",name:"Services"}];
const services=[
 {slug:"system-modernization",name:"System modernisation",description:"Update ageing software, improve usability and connect the tools your business relies on."},
 {slug:"email-marketing",name:"Email marketing and automation",description:"Build useful email campaigns and follow-up sequences around your customers and the way your business works."},
 {slug:"seo",name:"Search and local visibility",description:"Help customers find your business through clearer website content, search foundations and local business listings."}
];
const websiteFeatures={"landing-page":["One focused page","Responsive design","Contact form and search foundations"],"business-website":["Four core pages","Responsive design","Custom functionality and enquiry forms"],"booking-system":["Business website","Online appointment booking","Your own booking admin panel"]};
export default function ProductsCatalogue({initialCategory="products"}){
 const [selected,setSelected]=useState(initialCategory);
 return <main className={s.page}>
  <section className={s.hero} data-website-intro><div className={s.container}><h1>Explore our products.</h1><p>Start with JovaBook, choose a website package, or get help with your existing systems.</p></div></section>
  <div className={`${s.container} ${s.layout}`}>
   <nav className={s.sidebar} aria-label="Browse categories">{categories.map(category=><button type="button" key={category.id} aria-pressed={selected===category.id} aria-controls={`catalogue-${category.id}`} onClick={()=>setSelected(category.id)}>{category.name}</button>)}</nav>
   <div className={s.content}>
    <section id="catalogue-products" hidden={selected!=="products"} aria-labelledby="product-heading">
     <header className={s.categoryHeading}><h2 id="product-heading">Products for your working day.</h2><p>Tools built by JovaMedia for the businesses that use them.</p></header>
     <article className={s.bookingCard}>
      <div className={s.bookingCopy}><h3>JovaBook</h3><p className={s.bookingLead}>A booking system for service businesses.</p><p>Let clients book online while you manage appointments, services, client records and deposits in one workspace.</p><Link href="/jovabook" className={s.primaryLink}>Explore JovaBook</Link><Link href="/jovabook#plans" className={s.textLink}>See plans and pricing</Link></div>
      <div className={s.bookingImage}><Image src="/jovabook/calendar-desktop.webp" alt="JovaBook calendar with a week of appointments" width={2880} height={1920} sizes="(max-width:800px) 90vw, 650px"/></div>
     </article>
    </section>
    <section id="catalogue-websites" hidden={selected!=="websites"} aria-labelledby="websites-heading">
     <header className={s.categoryHeading}><h2 id="websites-heading">A website that fits your business.</h2><p>Three packages, from a focused landing page to a website with its own booking system.</p></header>
     <div className={s.websiteGrid}>{products.filter(product=>product.category==="websites").map(product=><article key={product.id} className={s.websiteCard}><h3>{product.name}</h3><p className={s.price}><span>From </span><strong>{formatPrice(product.amount)}</strong></p><p>{product.description}</p><ul>{websiteFeatures[product.id].map(feature=><li key={feature}>{feature}</li>)}</ul><Link className={s.primaryLink} href={`/get-a-quote?product=${product.id}`}>Enquire about this website</Link></article>)}</div>
     <Link className={s.textLink} href="/pricing">Compare website packages and Webcare</Link>
    </section>
    <section id="catalogue-services" hidden={selected!=="services"} aria-labelledby="services-heading">
     <header className={s.categoryHeading}><h2 id="services-heading">Make more of the tools you use.</h2><p>Practical support for your systems, email marketing and search visibility.</p></header>
     <div className={s.serviceGrid}>{services.map(service=><Link href={`/services/${service.slug}`} key={service.slug} className={s.serviceCard}><div className={s.serviceImage}><Image src={`/service-crafted/${serviceArt[service.slug]}.webp`} alt={serviceArtAlt[service.slug]} fill sizes="(max-width:650px) 90vw, 300px"/></div><div className={s.serviceBody}><h3>{service.name}</h3><p>{service.description}</p><span>Explore service</span></div></Link>)}</div>
    </section>
   </div>
  </div>
 </main>;
}
