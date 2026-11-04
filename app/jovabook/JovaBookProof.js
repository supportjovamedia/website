"use client";

import Image from "next/image";
import {useState} from "react";
import useCardRail from "@/components/useCardRail";
import RailPagination from "@/components/RailPagination";
import {jovabookTestimonials} from "@/data/jovabook-testimonials";
import {jovabookFounderNote} from "@/data/jovabook-founder";

function RailArrows({active,count,onSelect,label}){
  return <div className="jb-rail-arrows" aria-label={label}>
    {active>0&&<button type="button" className="jb-rail-prev" aria-label="Previous card" onClick={()=>onSelect(active-1)}><span aria-hidden="true">‹</span></button>}
    {active<count-1&&<button type="button" className="jb-rail-next" aria-label="Next card" onClick={()=>onSelect(active+1)}><span aria-hidden="true">›</span></button>}
  </div>;
}

function DepositPreview(){
  const [percent,setPercent]=useState(20);
  return <div className="jb-deposit-preview">
    <label className="jb-deposit-top" htmlFor="jb-deposit-range"><span>Deposit percentage</span><strong>{percent}%</strong></label>
    <input id="jb-deposit-range" type="range" min="0" max="100" step="5" value={percent} onChange={event=>setPercent(Number(event.target.value))} style={{"--deposit-progress":`${percent}%`}} aria-label="Preview deposit percentage" />
    <div className="jb-deposit-bottom"><span>Paid to your business</span><b>stripe</b></div>
  </div>;
}

export function WhyJovaBook(){
  const {rail,registerCard,active,select}=useCardRail();
  const benefits=[
    {id:"jb-benefit-website",name:"Website included"},
    {id:"jb-benefit-deposits",name:"Your deposit settings"},
    {id:"jb-benefit-link",name:"One booking link"},
    {id:"jb-benefit-dashboard",name:"Your dashboard"},
  ];
  // owner to review wording before publish
  return <section className="jb-why" aria-labelledby="jb-why-title">
    <div className="jb-proof-wrap">
      <h2 id="jb-why-title">More than a booking calendar.</h2>
      <div className="jb-benefit-shell"><div className="jb-benefit-grid" ref={rail} tabIndex={0} role="region" aria-label="JovaBook benefits">
        <article id="jb-benefit-website" ref={node=>registerCard(0,node)} data-active={active===0} className="jb-benefit jb-benefit-website">
          <div className="jb-benefit-copy"><h3>Your website is included.</h3><p>Every plan gives you a business website connected to your booking page, at no extra cost.</p></div>
          <div className="jb-site-preview" aria-hidden="true"><div className="jb-browser-bar"><i/><i/><i/><span>jovastudio.jovamedia.com</span></div><Image src="/jovabook/website.webp" alt="" width={1440} height={1966} sizes="(max-width: 700px) 340px, 580px" /></div>
        </article>
        <article id="jb-benefit-deposits" ref={node=>registerCard(1,node)} data-active={active===1} className="jb-benefit jb-benefit-deposits">
          <div className="jb-benefit-copy"><h3>Choose your deposit.</h3><p>Set the percentage. Customers pay directly into your connected Stripe account.</p></div>
          <DepositPreview/>
        </article>
        <article id="jb-benefit-link" ref={node=>registerCard(2,node)} data-active={active===2} className="jb-benefit jb-benefit-link">
          <div className="jb-benefit-copy"><h3>One link to share.</h3><p>Put your booking link on your website or in your Instagram bio.</p></div>
          <div className="jb-link-preview" aria-hidden="true"><div className="jb-link-address">jovastudio.jovamedia.com</div><div className="jb-link-phone"><Image src="/jovabook/booking-mobile.webp" alt="" width={750} height={1622} sizes="180px" /></div></div>
        </article>
        <article id="jb-benefit-dashboard" ref={node=>registerCard(3,node)} data-active={active===3} className="jb-benefit jb-benefit-dashboard">
          <div className="jb-benefit-copy"><h3>Everything in one place.</h3><p>Manage your diary, services, clients and working hours from your dashboard.</p></div>
          <div className="jb-dashboard-preview" aria-hidden="true"><Image src="/jovabook/dashboard.webp" alt="" width={2880} height={1920} sizes="(max-width: 700px) 340px, 580px" /></div>
        </article>
      </div><RailArrows active={active} count={benefits.length} onSelect={select} label="Browse JovaBook benefits"/></div>
      <RailPagination className="jb-pagination" label="Choose a JovaBook benefit" items={benefits} active={active} onSelect={select}/>
    </div>
  </section>;
}

function CustomerQuote({testimonial,featured=false,id,cardRef,active}){
  const {quote,name,business,type,rating}=testimonial;
  const initials=name.split(" ").map(part=>part[0]).slice(0,2).join("");
  return <blockquote id={id} ref={cardRef} data-active={active} className={featured?"jb-quote-featured":""}>
    {rating&&<span className="jb-review-stars" role="img" aria-label={`${rating} out of 5 stars`}>{"★".repeat(rating)}</span>}
    <p>“{quote}”</p>
    <footer><span className="jb-review-avatar" aria-hidden="true">{initials}</span><span><cite>{name}</cite><small>{business||type||"JovaBook customer"}</small></span></footer>
  </blockquote>;
}

export function JovaBookTestimonials(){
  const {rail,registerCard,active,select}=useCardRail();
  if (!jovabookTestimonials.length) return null;
  const featured=jovabookTestimonials.at(-1);
  const others=jovabookTestimonials.slice(0,-1);
  const ordered=[featured,...others];
  return <section className="jb-testimonials" aria-labelledby="jb-testimonials-title">
    <div className="jb-proof-wrap">
      <h2 id="jb-testimonials-title">What our customers say</h2>
      <div className="jb-quote-shell"><div className="jb-quote-grid" ref={rail} tabIndex={0} role="region" aria-label="JovaBook customer reviews">{ordered.map((testimonial,index)=><CustomerQuote testimonial={testimonial} featured={index===0} id={`jb-review-${index}`} active={active===index} cardRef={node=>registerCard(index,node)} key={`${testimonial.name}-${index}`}/>)}</div><RailArrows active={active} count={ordered.length} onSelect={select} label="Browse JovaBook reviews"/></div>
      <RailPagination className="jb-pagination" label="Choose a JovaBook review" items={ordered.map((testimonial,index)=>({id:`jb-review-${index}`,name:`Review by ${testimonial.name}`}))} active={active} onSelect={select}/>
    </div>
  </section>;
}

export function JovaBookFounderNote(){
  if (!jovabookFounderNote?.text?.trim()) return null;
  return <section className="jb-founder" aria-labelledby="jb-founder-title">
    <div className="jb-proof-wrap">
      <h2 id="jb-founder-title">{jovabookFounderNote.heading}</h2>
      <div className="jb-founder-panel"><div className="jb-founder-content">
        {jovabookFounderNote.lead&&<p className="jb-founder-lead">{jovabookFounderNote.lead}</p>}
        <p>{jovabookFounderNote.text}</p>
      </div><div className="jb-founder-visual" aria-hidden="true"><Image src="/jovabook/calendar-desktop.webp" alt="" width={2880} height={1920} sizes="(max-width: 700px) 360px, 600px" /></div></div>
    </div>
  </section>;
}

