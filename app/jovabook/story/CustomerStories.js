"use client";
import {useRef,useState} from 'react';

// Existing customer wording is retained verbatim; category labels were supplied
// by the owner. These symbols reuse the registration category paths.
export const customerStories=[
 {name:'Keith Loddy',category:'Trades / home services',icon:'professional',quote:'“I love how easy the management dashboard is and I love that I can personalise it. It looks so modern and classy”',highlight:'modern and classy'},
 {name:'Charmaine Dias',category:'Beauty Salon',icon:'beauty',quote:'“JovaBook makes it easy for my clients to book online, and I can see everything in one place.”',highlight:'easy for my clients to book online'},
 {name:'Ankit Shah',category:'Photography',icon:'photography',quote:'“Having my booking page, calendar and website together has made managing appointments much simpler.”',highlight:'managing appointments much simpler'},
 {name:'Zhang Min',category:'Nail technician',icon:'nails',quote:'“My clients can book and pay a deposit online, which means less time going back and forth over messages.”',highlight:'book and pay a deposit online'},
 {name:'Paul Smith',category:'Personal training',business:'CoreFitness',icon:'fitness',quote:'“The setup was straightforward, and I like having a booking page that feels personal to my business.”',highlight:'feels personal to my business'}
];

const industryPaths={
 professional:'M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3',
 beauty:'M9 8V4h6v4M7 8h10v13H7zM8 4h11',
 photography:'M3 7h4l2-3h6l2 3h4v14H3zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 nails:'M8 10V6a4 4 0 0 1 8 0v4M6 10h12v11H6z',
 fitness:'M2 9v6m4-9v12m12-12v12m4-9v6M6 12h12',
 other:'M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3'
};
function IndustryIcon({name}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={industryPaths[name]||industryPaths.other}/></svg>;}
function QuoteIcon(){return <svg className="cs-quote-icon" viewBox="0 0 32 26" fill="currentColor" aria-hidden="true"><path d="M0 14C0 6 4 1 12 0v5c-4 1-6 3-6 6h6v15H0V14Zm20-3h6v15H14V14C14 6 18 1 26 0v5c-4 1-6 3-6 6Z"/></svg>;}

function StoryQuote({quote,highlight}){
 const start=highlight?quote.indexOf(highlight):-1;
 if(start<0)return quote;
 return <>{quote.slice(0,start)}<span className="cs-quote-highlight">{highlight}</span>{quote.slice(start+highlight.length)}</>;
}

export default function CustomerStories(){
 const [active,setActive]=useState(0),gesture=useRef(null),count=customerStories.length;
 const select=index=>setActive((index+count)%count);
 const order=Array.from({length:count},(_,offset)=>(active+offset)%count);
 function onKeyDown(event){
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const next=event.key==='ArrowRight'?active+1:event.key==='ArrowLeft'?active-1:event.key==='Home'?0:event.key==='End'?count-1:null;
  if(next!==null){event.preventDefault();select(next);}
 }
 function onPointerDown(event){
  if(event.isPrimary===false){gesture.current=null;return;}
  if(event.pointerType==='mouse'&&event.button!==0)return;
  gesture.current={x:event.clientX,y:event.clientY,id:event.pointerId};
  try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch{}
 }
 function onPointerUp(event){
  const start=gesture.current;gesture.current=null;
  if(!start||start.id!==event.pointerId)return;
  const x=event.clientX-start.x,y=event.clientY-start.y;
  if(Math.abs(x)>=40&&Math.abs(x)>Math.abs(y)*1.4)setActive(index=>(index+(x<0?1:-1)+count)%count);
 }
 return <section className="cs-stories" id="customer-stories" aria-labelledby="customer-stories-title">
  <header className="cs-heading"><h2 id="customer-stories-title">Loved by service businesses.</h2><p>See what business owners say about JovaBook.</p></header>
  <div className="cs-grid" id="customer-stories-slides" role="group" aria-roledescription="carousel" aria-label="Customer stories" aria-keyshortcuts="ArrowLeft ArrowRight Home End" tabIndex={0} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={()=>{gesture.current=null;}} onDragStart={event=>event.preventDefault()}>
   {order.map((index,offset)=>{const story=customerStories[index];return <article key={story.name} className="cs-card" data-story-state={offset===0?'featured':'hidden'} hidden={offset!==0} aria-hidden={offset!==0} aria-roledescription="slide" aria-label={'Story '+(index+1)+' of '+count}>
    <div className="cs-story-body"><QuoteIcon/><blockquote><StoryQuote quote={story.quote} highlight={story.highlight}/></blockquote><footer className="cs-author"><span className="cs-category-symbol"><IndustryIcon name={story.icon}/></span><div className="cs-byline"><strong>{story.name}</strong><span className="cs-category">{story.category}</span>{story.business&&<span className="cs-business">{story.business}</span>}</div></footer></div>
   </article>;})}
  </div>
  <div className="cs-controls" role="group" aria-label="Choose a customer story"><button className="cs-arrow" type="button" aria-label="Previous customer story" aria-controls="customer-stories-slides" onClick={()=>select(active-1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button><div className="cs-dots">{customerStories.map((story,index)=><button className="cs-dot" type="button" key={story.name} aria-label={'Show story by '+story.name} aria-pressed={active===index} aria-controls="customer-stories-slides" onClick={()=>select(index)}><span/></button>)}</div><button className="cs-arrow" type="button" aria-label="Next customer story" aria-controls="customer-stories-slides" onClick={()=>select(active+1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></div>
  <p className="cs-sr-only" role="status" aria-live="polite" aria-atomic="true">{'Story '+(active+1)+' of '+count+': '+customerStories[active].name}</p>
 </section>;
}
