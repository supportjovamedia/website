"use client";
import {useEffect,useRef} from 'react';
import {pricingMarkup} from './story/pricing-markup.mjs';
import {enhancePricing} from './story/enhance-pricing.mjs';

export default function JovaBookPlans({enhancedByStory=false,headingLevel=2}){
 const root=useRef(null);
 useEffect(()=>{if(!enhancedByStory)return enhancePricing(root.current);},[enhancedByStory]);
 const html=headingLevel===1?pricingMarkup.replace('<h2>A plan for your business.</h2>','<h1>A plan for your business.</h1>'):pricingMarkup;
 return <div className="story-fragment" ref={root} dangerouslySetInnerHTML={{__html:html}}/>;
}
