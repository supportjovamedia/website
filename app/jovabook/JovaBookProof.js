import {jovabookTestimonials} from "@/data/jovabook-testimonials";
import {jovabookFounderNote} from "@/data/jovabook-founder";

const reasons = [
  {title: "A website from day one", text: "Every plan includes a business website connected to your booking page."},
  {title: "Deposits paid to you", text: "Connect your own Stripe account to receive deposits from customers who book online."},
  {title: "One link to share", text: "Put your booking link on your website or in your Instagram bio."},
  {title: "Pricing you can see", text: "Plans start at £20 a month, with a 3-day free trial."},
];

export function WhyJovaBook(){
  // owner to review wording before publish
  return <section className="jb-why" aria-labelledby="jb-why-title">
    <div className="jb-proof-wrap">
      <h2 id="jb-why-title">Why choose JovaBook?</h2>
      <div className="jb-why-grid">{reasons.map(({title,text})=><article key={title}>
        <h3>{title}</h3><p>{text}</p>
      </article>)}</div>
    </div>
  </section>;
}

export function JovaBookTestimonials(){
  if (!jovabookTestimonials.length) return null;
  return <section className="jb-testimonials" aria-labelledby="jb-testimonials-title">
    <div className="jb-proof-wrap">
      <h2 id="jb-testimonials-title">What our customers say</h2>
      <div className="jb-quote-grid">{jovabookTestimonials.map(({quote,name,business,type},index)=><blockquote className={index===jovabookTestimonials.length-1&&jovabookTestimonials.length%2!==0?"jb-quote-featured":""} key={`${name}-${index}`}>
        <p>“{quote}”</p>
        <footer><cite>{name}</cite>{business&&<span>{business}</span>}{type&&<span>{type}</span>}</footer>
      </blockquote>)}</div>
    </div>
  </section>;
}

export function JovaBookFounderNote(){
  if (!jovabookFounderNote?.text?.trim()) return null;
  return <section className="jb-founder" aria-labelledby="jb-founder-title">
    <div className="jb-proof-wrap jb-founder-layout">
      <h2 id="jb-founder-title">{jovabookFounderNote.heading}</h2>
      <p>{jovabookFounderNote.text}</p>
    </div>
  </section>;
}
