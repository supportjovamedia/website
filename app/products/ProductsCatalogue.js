"use client";
import Image from "next/image";
import Link from "next/link";
import {useState} from "react";
import {products,formatPrice} from "@/lib/products.mjs";
import {serviceArt,serviceArtAlt} from "@/lib/service-art";
import s from "./products.module.css";
const categories=[{id:"websites",name:"Websites"},{id:"services",name:"Services"}];
const services=[
 {slug:"system-modernization",name:"System modernisation",description:"Update ageing software, improve usability and connect the tools your business relies on."},
 {slug:"email-marketing",name:"Email marketing and automation",description:"Build useful email campaigns and follow-up sequences around your customers and the way your business works."},
 {slug:"seo",name:"Search and local visibility",description:"Help customers find your business through clearer website content, search foundations and local business listings."}
];
const websiteFeatures={"landing-page":["One focused page","Responsive design","Contact form and search foundations"],"business-website":["Four core pages","Responsive design","Custom functionality and enquiry forms"],"booking-system":["Business website","Online appointment booking","Your own booking admin panel"]};
export default function ProductsCatalogue({initialCategory="websites"}){
 const [selected,setSelected]=useState(initialCategory);
 return <main className={s.page}>
  <section className={s.hero} data-website-intro><div className={s.container}><h1>Our other products.</h1><p>Choose a website package, or get help with your existing systems, email marketing and search visibility.</p><Link prefetch={false} className={s.heroLink} href="/websites">Explore our website design</Link></div></section>
  <div className={`${s.container} ${s.layout}`}>
   <nav className={s.sidebar} aria-label="Browse categories">{categories.map(category=><button type="button" key={category.id} aria-pressed={selected===category.id} aria-controls={`catalogue-${category.id}`} onClick={()=>setSelected(category.id)}>{category.name}</button>)}</nav>
   <div className={s.content}>
    <section id="catalogue-websites" hidden={selected!=="websites"} aria-labelledby="websites-heading">
     <header className={s.categoryHeading}><h2 id="websites-heading">A website that fits your business.</h2><p>Three packages, from a focused landing page to a website with its own booking system.</p></header>
     <div className={s.websiteGrid}>{products.filter(product=>product.category==="websites").map(product=><article key={product.id} className={s.websiteCard}><h3>{product.name}</h3><p className={s.price}><span>From </span><strong>{formatPrice(product.amount)}</strong></p><p>{product.description}</p><ul>{websiteFeatures[product.id].map(feature=><li key={feature}>{feature}</li>)}</ul><Link className={s.primaryLink} href={`/get-a-quote?product=${product.id}`}>Enquire about this website</Link></article>)}</div>
     <Link className={s.textLink} href="/products/pricing">Compare website packages and Webcare</Link>
    </section>
    <section id="catalogue-services" hidden={selected!=="services"} aria-labelledby="services-heading">
     <header className={s.categoryHeading}><h2 id="services-heading">Make more of the tools you use.</h2><p>Practical support for your systems, email marketing and search visibility.</p></header>
     <div className={s.serviceGrid}>{services.map(service=><Link prefetch={false} href={`/services/${service.slug}`} key={service.slug} className={s.serviceCard}><div className={s.serviceImage}><Image src={`/service-crafted/${serviceArt[service.slug]}.webp`} alt={serviceArtAlt[service.slug]} fill sizes="(max-width:650px) 90vw, 300px"/></div><div className={s.serviceBody}><h3>{service.name}</h3><p>{service.description}</p><span>Explore service</span></div></Link>)}</div>
    </section>
   </div>
  </div>
 </main>;
}
