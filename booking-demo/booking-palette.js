/* Category colours are scoped to the supplied salon, with no global active-salon cache. */
(() => {
  'use strict';
  const choices=Object.freeze([
    {name:'Rose',value:'#f5c6e9'},
    {name:'Lavender',value:'#cdc1f6'},
    {name:'Sky',value:'#b7e7f1'},
    {name:'Peach',value:'#ffddb5'},
    {name:'Sage',value:'#c5ead3'},
    {name:'Butter',value:'#f2e4aa'},
    {name:'Clay',value:'#edc9bc'},
    {name:'Periwinkle',value:'#c8d8f5'}
  ]);
  const safeColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():null;
  const known=(salon,id)=>(salon?.categories||[]).some(category=>String(category.id)===String(id));
  function clean(salon){
    const source=salon?.workspace?.categoryColors;
    return Object.fromEntries((salon?.categories||[]).flatMap(category=>{
      const id=String(category.id),value=source&&Object.hasOwn(source,id)?safeColor(source[id]):null;
      return value?[[id,value]]:[];
    }));
  }
  const workspace=salon=>({...salon?.workspace,categoryColors:clean(salon)});
  function category(salon,id){
    if(!id||!known(salon,id))return '#e3e7ed';
    const source=salon?.workspace?.categoryColors;
    const saved=source&&Object.hasOwn(source,id)?safeColor(source[id]):null;
    if(saved)return saved;
    let hash=2166136261;for(const char of String(id)){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619)>>>0;}hash=(hash^(hash>>>16))>>>0;
    return choices[hash%choices.length].value;
  }
  function colour(booking,salon){
    const service=(salon?.services||[]).find(item=>item.id===booking?.serviceId);
    const fill=category(salon,service?.categoryId),rgb=fill.slice(1).match(/../g).map(value=>parseInt(value,16));
    const luminance=values=>values.map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0);
    const light=luminance(rgb),dark=luminance([23,35,45]);
    const ink=(light+.05)/(dark+.05)>=4.5?'#17232d':1.05/(light+.05)>=4.5?'#ffffff':'#000000';
    const edge='#'+rgb.map(value=>Math.round(value*.7).toString(16).padStart(2,'0')).join('');
    return {fill,ink,edge};
  }
  const style=(booking,salon)=>{const c=colour(booking,salon);return `--event-fill:${c.fill};--event-ink:${c.ink};--event-edge:${c.edge}`;};
  window.JovaBookingPalette={choices,safeColor,clean,workspace,category,colour,style};
})();
