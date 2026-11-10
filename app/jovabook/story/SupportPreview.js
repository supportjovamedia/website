"use client";
import {useState} from 'react';
import {loadLiveChat} from '@/lib/live-chat.mjs';
import {productionAnalyticsHost} from '@/lib/editorial-routes.mjs';

export default function SupportPreview(){
 const [notice,setNotice]=useState('');
 const openChat=()=>{
  if(!productionAnalyticsHost(window.location.hostname)){setNotice('Live chat opens on the live JovaMedia website. You can also email our team.');return;}
  loadLiveChat(window,document);
  window.$crisp=window.$crisp||[];
  window.$crisp.push(['do','chat:show']);
  window.$crisp.push(['do','chat:open']);
  setNotice('Opening live chat. You can also email our team.');
 };
 return <section className="sf-support js-wrap" id="ex-support" data-story-section aria-labelledby="sf-support-title">
  <div className="sf-support-panel">
   <div className="sf-support-copy">
    <span className="sf-support-label">24/7 chat access</span>
    <h2 id="sf-support-title">A real person.<br/>A message away.</h2>
    <p>Need a hand with JovaBook? Send us a message any time.</p>
    <p className="sf-support-availability">Our team replies when available.</p>
    <div className="sf-support-actions"><button type="button" onClick={openChat}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 2v-6a8.5 8.5 0 1 1 19-4.5Z"/><path d="M7 11h.01M11 11h.01M15 11h.01"/></svg><span>Open live chat</span></button><a href="mailto:support.jovamedia@gmail.com">Email support</a></div>
    <p className="sf-support-notice" role="status">{notice}</p>
   </div>
   <div className="sf-support-graphic" aria-hidden="true"><svg viewBox="0 0 330 270" focusable="false"><rect x="14" y="14" width="255" height="181" rx="55" fill="#FFD700"/><path d="M57 175v62l68-58Z" fill="#FFD700"/><text x="141" y="132" textAnchor="middle" fill="#111" fontFamily="Arial, sans-serif" fontSize="77" fontWeight="800" letterSpacing="-4">24/7</text><path d="M218 151h54c22 0 39 17 39 38s-17 38-39 38h-5l15 25-38-25h-26c-22 0-39-17-39-38s17-38 39-38Z" fill="#fff" stroke="#111" strokeWidth="3" strokeLinejoin="round"/><circle cx="223" cy="189" r="6" fill="#111"/><circle cx="245" cy="189" r="6" fill="#111"/><circle cx="267" cy="189" r="6" fill="#111"/></svg></div>
  </div>
 </section>;
}
