/* View state only. Filtering stays with each list; no records are written. */
(() => {
 'use strict';
 const states=new Map(),size=20;
 function take(key,items,scope,filter=''){
  const signature=String(scope)+'|'+String(filter);
  let state=states.get(key);
  if(!state||state.signature!==signature){state={signature,page:0,pages:1};states.set(key,state);}
  const pages=Math.max(1,Math.ceil(items.length/size));
  state.pages=pages;state.page=Math.min(state.page,pages-1);
  if(state.reveal){const index=items.findIndex(item=>item.id===state.reveal);if(index>=0)state.page=Math.floor(index/size);delete state.reveal;}
  const start=state.page*size,end=Math.min(items.length,start+size);
  const control=(direction,label,disabled)=>'<button type="button" data-action="list-page" data-list="'+key+'" data-direction="'+direction+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
  const footer=pages>1?'<nav class="jg-pagination" aria-label="'+key+' pages"><span>Showing '+(start+1)+' to '+end+' of '+items.length+'</span><div>'+control(-1,'Previous',state.page===0)+'<b>Page '+(state.page+1)+' of '+pages+'</b>'+control(1,'Next',state.page===pages-1)+'</div></nav>':'';
  return {items:items.slice(start,end),footer,total:items.length,page:state.page,pages};
 }
 function move(key,direction){const state=states.get(key);if(!state||![-1,1].includes(direction))return false;const next=Math.max(0,Math.min(state.pages-1,state.page+direction));if(next===state.page)return false;state.page=next;return true;}
 function reveal(key,id){const state=states.get(key);if(state)state.reveal=id;}
 window.JovaListPages={take,move,reveal,size};
})();
