'use client';
import {useRef,useState} from 'react';
import designs from '../../../booking-demo/website-designs.cjs';

const choices=[['one-page','Evergreen','Natural and welcoming'],['brightside','Cobalt','Confident and colourful'],['form','Terracotta','Warm and editorial'],['willow','Olive','Calm and considered']];
export default function WebsiteShowcase(){
 const [selected,setSelected]=useState('one-page'),preview=useRef(null);
 const model={template:selected,name:'Avery Studio',headline:selected==='one-page'?'Time for you. Care that fits.':'Avery Studio',intro:'Thoughtful treatments, personal care and time just for you.',about:'An independent neighbourhood studio offering thoughtful treatments and personal care. Choose your service and reserve your next appointment online.',booking:'https://book.jovamedia.com/?demo=jova-demo#book/service',hero:selected==='one-page'?'/jovabook/industries/spa-large-f1283ccbdc64.webp':'/home-agency/plant.webp',services:[{name:'Brow shape & tint',price:'£25'},{name:'Lash lift',price:'£55'},{name:'Gel manicure',price:'£35'},{name:'Cut & finish',price:'£48'},{name:'Blow dry & style',price:'£32'}],contacts:[{kind:'phone',label:'Phone',value:'020 7946 0123',href:'tel:02079460123'},{kind:'email',label:'Email',value:'hello@example.com',href:'mailto:hello@example.com'},{kind:'pin',label:'Location',value:'24 High Street, London'}],hours:[{day:'Monday to Saturday',value:'09:00 to 18:00'},{day:'Sunday',value:'Closed'}],embedded:true,powered:true};
 // Preview headings are subordinate to the homepage H1. Public sites retain their own H1.
 const html=designs.render(model).replace('<h1>','<h3 class="wd-title">').replace('</h1>','</h3>');
 return <section id="ex-websites" className="website-showcase" data-story-section>
  <div className="ws-showcase-inner">
   <header className="ws-showcase-heading"><h2>Your website. Included.</h2><p>A one-page website personalised to your business, connected to your booking page.</p></header>
   <div className="ws-design-options" role="group" aria-label="Website designs">{choices.map(([id,name,description])=><button key={id} type="button" aria-pressed={selected===id} onClick={()=>{setSelected(id);preview.current?.scrollTo({top:0});}}><b>{name}</b><span>{description}</span></button>)}</div>
   <div className="ws-website-browser" ref={preview} role="img" aria-label={designs.names[selected]+' website design preview'}><div inert dangerouslySetInnerHTML={{__html:html}}/></div>
   <div className="ws-share-benefit"><strong>One link to share.</strong><p>Put it on your website, Instagram bio or WhatsApp.</p></div>
  </div>
 </section>;
}
