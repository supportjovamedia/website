'use client';
import {useRef,useState} from 'react';
import {websiteReferenceImages} from './website-reference-images.mjs';
const choices=[['one-page','Evergreen','Natural and welcoming'],['brightside','Cobalt','Confident and colourful'],['form','Terracotta','Warm and editorial'],['willow','Olive','Calm and considered']];
export default function WebsiteShowcase(){
 const [selected,setSelected]=useState('one-page'),preview=useRef(null);
 const name=choices.find(([id])=>id===selected)[1],images=websiteReferenceImages[selected];
 return <section id="ex-websites" className="website-showcase" data-story-section><div className="ws-showcase-inner">
  <header className="ws-showcase-heading"><h2>Your website. Included.</h2><p>A one-page website personalised to your business, connected to your booking page.</p></header>
  <div className="ws-design-options" role="group" aria-label="Website designs">{choices.map(([id,label,description])=><button key={id} type="button" aria-pressed={selected===id} onClick={()=>{setSelected(id);preview.current?.scrollTo({top:0});}}><b>{label}</b><span>{description}</span></button>)}</div>
  <div className="ws-website-browser" ref={preview} role="img" aria-label={name+' website design preview'}><div inert><picture key={selected}>
   <source media="(max-width:700px)" srcSet={images.mobile.src} width={images.mobile.width} height={images.mobile.height}/>
   <img className="ws-reference-image" src={images.desktop.src} width={images.desktop.width} height={images.desktop.height} alt={name+' website design with services and contact details'} loading="lazy" decoding="async" draggable={false}/>
  </picture></div></div>
  <div className="ws-share-benefit"><strong>One link to share.</strong><p>Put it on your website, Instagram bio or WhatsApp.</p></div>
 </div></section>;
}
