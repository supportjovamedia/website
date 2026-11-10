"use client";
import {useEffect,useRef,useState} from 'react';
import {FaqStory} from '@/components/ScrollStories';
import {faqs} from '../faqs.mjs';

const initialCount=6;

export default function StoryFaq(){
  const [expanded,setExpanded]=useState(false);
  const root=useRef(null);
  useEffect(()=>{
    root.current?.querySelectorAll('[data-story-card]').forEach((item,index)=>{
      const hide=!expanded&&index>=initialCount;
      if(hide)item.querySelectorAll('details[open]').forEach(detail=>{detail.open=false;});
      item.hidden=hide;
    });
  },[expanded]);
  return <div className="ws"><div className="ws-original-faq" id="jovabook-faq-content" ref={root} data-faq-expanded={expanded?'true':'false'}>
    <FaqStory items={faqs.map(({question,answer})=>[question,answer])} introduction="" contactHref="mailto:support.jovamedia@gmail.com" contactLabel="Ask the JovaMedia team" showArtwork={false}/>
    {faqs.length>initialCount&&<div className="faq-more-controls"><button className="faq-more-button" type="button" aria-expanded={expanded} aria-controls="jovabook-faq-content" onClick={event=>{setExpanded(value=>!value);event.currentTarget.focus({preventScroll:true});}}>{expanded?'Show fewer FAQs':'Show more FAQs'}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={expanded?'m6 15 6-6 6 6':'m6 9 6 6 6-6'}/></svg></button></div>}
  </div></div>;
}
