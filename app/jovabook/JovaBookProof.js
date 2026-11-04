"use client";

import Image from "next/image";
import {useRef} from "react";
import {jovabookTestimonials} from "@/data/jovabook-testimonials";
import {jovabookFounderNote} from "@/data/jovabook-founder";

function RailControls({rail,label}){
  function move(direction){
    const card=rail.current?.firstElementChild;
    if (!card) return;
    const gap=parseFloat(getComputedStyle(rail.current).columnGap)||0;
    rail.current.scrollBy({left:direction*(card.getBoundingClientRect().width+gap),behavior:"smooth"});
  }
  return <div className="jb-rail-controls" aria-label={`${label} controls`}>
    <button type="button" aria-label={`Previous ${label}`} onClick={()=>move(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
    <button type="button" aria-label={`Next ${label}`} onClick={()=>move(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
  </div>;
}

export function WhyJovaBook(){
  const rail=useRef(null);
  // owner to review wording before publish
  return <section className="jb-why" aria-labelledby="jb-why-title">
    <div className="jb-proof-wrap">
      <div className="jb-section-heading"><h2 id="jb-why-title">Why choose JovaBook?</h2><RailControls rail={rail} label="feature cards"/></div>
      <div className="jb-benefit-rail" ref={rail} tabIndex={0} aria-label="JovaBook features">
        <article className="jb-benefit jb-benefit-website">
          <div className="jb-benefit-copy"><h3>A website comes with it.</h3><p>Every plan includes a business website connected to your booking page.</p></div>
          <div className="jb-site-preview" aria-hidden="true"><Image src="/jovabook/website-optimized.webp" alt="" width={1440} height={1966} sizes="(max-width: 700px) 320px, 410px" /></div>
        </article>
        <article className="jb-benefit jb-benefit-deposits">
          <div className="jb-benefit-copy"><h3>Deposits go to you.</h3><p>Connect your own Stripe account to receive deposits from online bookings.</p></div>
          <div className="jb-deposit-preview" aria-hidden="true"><span>Customer deposit</span><strong>Your Stripe account.</strong><span className="jb-deposit-paid">Paid directly to your business</span></div>
        </article>
        <article className="jb-benefit jb-benefit-link">
          <div className="jb-benefit-copy"><h3>One link to share.</h3><p>Put your booking link on your website or in your Instagram bio.</p></div>
          <div className="jb-phone-preview" aria-hidden="true"><Image src="/jovabook/booking-mobile.webp" alt="" width={750} height={1622} sizes="190px" /></div>
        </article>
        <article className="jb-benefit jb-benefit-pricing">
          <div className="jb-benefit-copy"><h3>Three days to try it.</h3><p>Plans start at £20 a month after your trial.</p></div>
          <div className="jb-price-preview"><strong>3</strong><span>days free</span></div>
        </article>
      </div>
    </div>
  </section>;
}

function CustomerQuote({testimonial,featured=false}){
  const {quote,name,business,type}=testimonial;
  return <blockquote className={featured?"jb-quote-featured":""}>
    <p>“{quote}”</p>
    <footer><cite>{name}</cite>{business&&<span>{business}</span>}{type&&<span>{type}</span>}</footer>
  </blockquote>;
}

export function JovaBookTestimonials(){
  const rail=useRef(null);
  if (!jovabookTestimonials.length) return null;
  const featured=jovabookTestimonials.at(-1);
  const others=jovabookTestimonials.slice(0,-1);
  return <section className="jb-testimonials" aria-labelledby="jb-testimonials-title">
    <div className="jb-proof-wrap">
      <div className="jb-section-heading"><h2 id="jb-testimonials-title">What our customers say</h2><RailControls rail={rail} label="testimonials"/></div>
      <div className="jb-quote-rail" ref={rail} tabIndex={0} aria-label="Customer testimonials"><CustomerQuote testimonial={featured} featured/>{others.map((testimonial,index)=><CustomerQuote testimonial={testimonial} key={`${testimonial.name}-${index}`}/>)}</div>
    </div>
  </section>;
}

export function JovaBookFounderNote(){
  if (!jovabookFounderNote?.text?.trim()) return null;
  return <section className="jb-founder" aria-labelledby="jb-founder-title">
    <div className="jb-proof-wrap"><div className="jb-founder-card">
      <h2 id="jb-founder-title">{jovabookFounderNote.heading}</h2>
      <p>{jovabookFounderNote.text}</p>
    </div></div>
  </section>;
}

