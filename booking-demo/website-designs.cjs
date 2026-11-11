/* Shared, escaped website markup for the public portal and marketing examples. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JovaWebsiteDesigns=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const names=Object.freeze({'one-page':'Evergreen',brightside:'Cobalt',form:'Terracotta',willow:'Olive'});
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const url=value=>{value=String(value||'');return /^(?:https?:\/\/|\/(?!\/)|\?|#|tel:\+?[\d]+$|mailto:[^\s<>"'?#]+$)/i.test(value)?escape(value):'';};
 const paths={calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M8 15h1m6 0h1m-8 3h1"/>',phone:'<path d="m5 3 4 4-2 3c2 4 3 5 7 7l3-2 4 4c-1 4-5 3-9 1C6 17 2 12 2 7c0-2 1-3 3-4Z"/>',email:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 5 9 8 9-8"/>',pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'};
 const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
 const inkOn=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4),light=rgb.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);return light>.179?'#000000':'#ffffff';};
 function render(m){
  const template=Object.hasOwn(names,m.template)?m.template:'one-page',theme=template==='one-page'?'evergreen':template==='brightside'?'cobalt':template==='form'?'terracotta':'olive';
  const e=escape,booking=url(m.booking),account=url(m.account),target=m.embedded?' target="_blank" rel="noopener"':'',action=(label,klass='')=>'<a class="wd-button '+klass+'" href="'+booking+'"'+target+'>'+label+'</a>';
  const sectionLink=(id,label)=>m.staticNavigation
   ?'<a href="#'+id+'">'+label+'</a>'
   :'<button type="button" data-action="bw-section" data-section="'+id+'">'+label+'</button>';
  const sectionId=id=>m.staticNavigation?' id="'+id+'"':'';
  const nav=sectionLink('home','Home')+sectionLink('about','About')+sectionLink('services','Services')+
   '<a href="'+booking+'"'+target+'>Book</a>'+sectionLink('contact','Contact');
  const services=Array.isArray(m.services)?m.services:[],rows=services.map(s=>'<li><a href="'+booking+'"'+target+'><span>'+e(s.name)+'</span><strong>'+e(s.price)+'</strong></a></li>');
  const contacts=(Array.isArray(m.contacts)?m.contacts:[]).map(c=>'<div class="wd-contact-row">'+icon(c.kind)+'<div><dt>'+e(c.label)+'</dt><dd>'+(c.href?'<a href="'+url(c.href)+'">'+e(c.value)+'</a>':e(c.value))+'</dd></div></div>').join('');
  const hours=(Array.isArray(m.hours)?m.hours:[]).map(h=>'<div class="bw-hours-row"><dt>'+e(h.day)+'</dt><dd>'+e(h.value)+'</dd></div>').join('');
  const header='<header class="wd-header"><div class="wd-brand">'+(m.logo?'<img src="'+url(m.logo)+'" alt="'+e(m.name)+'" width="160" height="80">':e(m.name))+'</div>'+'<details class="wd-menu"><summary aria-label="Website menu"><span></span><span></span><span></span></summary><nav aria-label="Website sections">'+nav+'</nav></details><nav class="wd-sidebar-nav" aria-label="Website sections">'+nav+'</nav></header>';
  const hero='<section class="wd-hero" data-wd-section="home"'+sectionId('home')+'>'+(m.hero?'<img data-bw-image class="wd-photo" src="'+url(m.hero)+'" alt="" width="1600" height="1000" decoding="async">':'<div class="wd-window-light" aria-hidden="true"></div>')+'<div class="wd-hero-copy">'+(theme==='cobalt'?'<span class="wd-eyebrow">Welcome to</span>':'')+'<h1>'+e(m.headline||m.name)+'</h1>'+(m.intro?'<p>'+e(m.intro)+'</p>':'')+action((theme==='evergreen'?icon('calendar'):'')+'Book an Appointment'+'','wd-hero-book')+'</div></section>';
  const book='<a class="wd-book-banner" href="'+booking+'"'+target+'>'+icon('calendar')+'<span><strong>Book Online</strong><span>Choose a service and book a time that works for you.</span></span>'+'</a>';
  const about='<section class="wd-about" data-wd-section="about"'+sectionId('about')+'><div><span class="wd-eyebrow">'+(theme==='cobalt'?'About us':'')+'</span><h2>'+e(m.aboutHeading||'About Us')+'</h2>'+(m.about?'<p>'+e(m.about)+'</p>':'<p>Find our services and book your next appointment online.</p>')+'</div>'+(theme==='cobalt'?book:'')+'</section>';
  const serviceBlock='<section class="wd-services" data-wd-section="services"'+sectionId('services')+'><span class="wd-eyebrow">'+(theme==='evergreen'?'':'Our Services')+'</span><h2>'+(theme==='cobalt'?'<span class="wd-mobile-title">What we offer</span><span class="wd-desktop-title">Services &amp; Pricing</span>':theme==='terracotta'?'Services & Pricing':theme==='olive'?'Services':'Our Services')+'</h2>'+(rows.length?'<ul class="wd-service-list">'+rows.slice(0,4).join('')+'</ul>'+(rows.length>4?'<details class="wd-more-services"><summary>View All Services '+'</summary><ul class="wd-service-list">'+rows.slice(4).join('')+'</ul></details>':''):'<p>Our services will be available here soon.</p>')+(theme==='evergreen'?action(icon('calendar')+'Book Online '):theme==='terracotta'&&rows.length<=4?action('View All Services ','wd-outline'):'')+'</section>';
  const contact='<section class="wd-contact bw-details" data-wd-section="contact"'+sectionId('contact')+'><div class="wd-contact-main"><span class="wd-eyebrow">'+(theme==='cobalt'?'Get in touch':'')+'</span><h2>'+(theme==='olive'?'Get in Touch':'Contact Us')+'</h2>'+(theme==='evergreen'?'':'<p>Have a question or want to book?<br>Get in touch.</p>')+'<section class="bw-contact" aria-label="Contact">'+(contacts?'<dl class="wd-contact-list">'+contacts+'</dl>':'<p>Contact details have not been added.</p>')+'</section><details class="wd-opening-hours bw-hours"><summary>Opening hours</summary>'+(hours?'<dl class="bw-hours-list">'+hours+'</dl>':'<p>Opening hours have not been added.</p>')+'</details></div>'+(theme==='cobalt'?'<aside class="wd-ready"><h2>Ready to<br>Book?</h2><p>View our services and book your appointment online.</p>'+action('Book Now ')+'</aside>':'')+'</section>';
  const brand=/^#[0-9a-f]{6}$/i.test(m.brand||'')?m.brand:'',heading=/^#[0-9a-f]{6}$/i.test(m.heading||'')?m.heading:'';
  const onBrand=inkOn(brand||({evergreen:'#244831',cobalt:'#f36a51',terracotta:'#a2583c',olive:'#343824'}[theme]));
  return '<div class="wd-responsive"><article class="wd-site wd-'+theme+'" data-website-layout="'+template+'" data-website-design="'+names[template]+'" style="'+(brand?'--wd-custom-brand:'+brand+';':'')+(heading?'--wd-custom-heading:'+heading+';':'')+'--wd-on-brand:'+onBrand+';">'+header+'<div class="wd-content">'+hero+about+(theme==='olive'?'<div class="wd-olive-offer">'+serviceBlock+book+'</div>':serviceBlock+(theme==='cobalt'||theme==='terracotta'?book:''))+contact+'</div><footer class="wd-footer"><span>'+e(m.name)+'</span>'+(account?'<a href="'+account+'">Log in</a>':'')+('<a href="https://www.jovamedia.com/" target="_blank" rel="noopener">Powered by <strong>JovaMedia</strong></a>')+'</footer></article></div>';
 }
 function bindMenus(root){
  const document=root.ownerDocument||root;
  const dismiss=event=>root.querySelectorAll('.wd-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});
  const escapeMenu=event=>{if(event.key!=='Escape')return;root.querySelectorAll('.wd-menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary')?.focus();event.preventDefault();});};
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escapeMenu);
  return ()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escapeMenu);};
 }
 return Object.freeze({names,render,bindMenus});
});
