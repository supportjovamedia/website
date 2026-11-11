'use client';
import {useRef,useState} from 'react';
import {websiteReferenceImages} from './website-reference-images.mjs';
const choices=[['one-page','Evergreen','Natural and welcoming'],['brightside','Cobalt','Confident and colourful'],['form','Terracotta','Warm and editorial'],['willow','Olive','Calm and considered']];
export default function WebsiteShowcase(){
 const [selected,setSelected]=useState('one-page');
 const [exploring,setExploring]=useState(false);
 const [sharingView,setSharingView]=useState(0);
 const preview=useRef(null);
 const exploreButton=useRef(null);
 const sharingTrack=useRef(null);
 const name=choices.find(([id])=>id===selected)[1],images=websiteReferenceImages[selected];

 function selectDesign(id){
  setSelected(id);
  setExploring(false);
  preview.current.scrollTop=0;
 }

 function toggleExploration(){
  setExploring(!exploring);
  if(!exploring) preview.current.focus({preventScroll:true});
 }

 function handlePreviewKey(event){
  if(event.key!=='Escape'||!exploring) return;
  event.preventDefault();
  setExploring(false);
  exploreButton.current.focus({preventScroll:true});
 }

 return <section id="ex-websites" className="website-showcase" data-story-section><div className="ws-showcase-inner">
  <header className="ws-showcase-heading"><h2>Your website. Included.</h2><p>A one-page website personalised to your business, connected to your booking page.</p></header>
  <div className="ws-design-options" role="group" aria-label="Website designs">{choices.map(([id,label,description])=><button key={id} type="button" aria-pressed={selected===id} onClick={()=>selectDesign(id)}><b>{label}</b><span>{description}</span></button>)}</div>
  <div className="ws-website-frame" onKeyDown={handlePreviewKey} onBlur={event=>{
   if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget)) setExploring(false);
  }}>
   <div className="ws-preview-toolbar">
    <button className="ws-preview-toggle" ref={exploreButton} type="button" aria-controls="ws-design-preview" onClick={toggleExploration}>
     {exploring?'Done exploring':'Explore preview'}
    </button>
   </div>
   <div id="ws-design-preview" className="ws-website-browser" ref={preview} role="region" aria-label={name+' website design preview'} tabIndex={exploring?0:-1} data-exploring={exploring}>
    <picture key={selected}>
     <source media="(max-width:700px)" srcSet={images.mobile.src} width={images.mobile.width} height={images.mobile.height}/>
     <img className="ws-reference-image" src={images.desktop.src} width={images.desktop.width} height={images.desktop.height} alt={name+' website design with services and contact details'} loading="lazy" decoding="async" draggable={false}/>
    </picture>
   </div>
  </div>
  <section className="ws-sharing-guide" id="website-google-visibility" aria-labelledby="ws-sharing-title">
   <div className="ws-sharing-intro">
    <div className="ws-sharing-heading">
     <span className="ws-sharing-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
       <path d="m10 13 4-4m-5 7-1.5 1.5a3.5 3.5 0 0 1-5-5L6 9a3.5 3.5 0 0 1 5 0m2-1 1.5-1.5a3.5 3.5 0 0 1 5 5L16 15a3.5 3.5 0 0 1-5 0"/>
      </svg>
     </span>
     <div>
      <h3 id="ws-sharing-title">One link to share.</h3>
      <p>Share it on Google, Instagram or WhatsApp.</p>
     </div>
    </div>
    <div className="ws-sharing-options" role="group" aria-label="Explore website sharing">
     {['Website link','Google visibility'].map((label,index)=><button key={label} type="button" aria-pressed={sharingView===index} aria-controls="ws-sharing-track" onClick={()=>{
      const track=sharingTrack.current;
      track.scrollTo({left:index*track.clientWidth});
     }}>{label}</button>)}
    </div>
   </div>
   <div className="ws-sharing-track" id="ws-sharing-track" ref={sharingTrack} onScroll={event=>{
    const track=event.currentTarget;
    setSharingView(Number(track.scrollLeft>=track.clientWidth/2));
   }}>
    <div className="ws-sharing-card" aria-hidden={sharingView!==0}>
     <div className="ws-profile-example" role="img" aria-label="Example Google Business Profile for Willow Hair Studio with a Website link">
      <div className="ws-profile-business">
       <span className="ws-profile-label">Example Google Business Profile</span>
       <strong>Willow Hair Studio</strong>
      </div>
      <span className="ws-profile-website">Website</span>
     </div>
     <p>In Google Business Profile, open <strong>Edit profile</strong> and paste your link into <strong>Website</strong>.</p>
    </div>
    <div className="ws-sharing-card" aria-hidden={sharingView!==1}>
     <div className="ws-visibility-example">
      <img src="/jovabook/story/google-visibility-setting.webp" alt="JovaBook dashboard with ‘Let Google find my website’ ticked" width="594" height="137" loading="lazy" decoding="async" />
     </div>
     <p>In <strong>Personalise → Website → Google visibility</strong>, tick the box and save.</p>
    </div>
   </div>
  </section>
 </div></section>;
}
