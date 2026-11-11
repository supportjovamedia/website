/* Owner-only themes: neutral working surfaces, controlled colour accents. */
(() => {
 'use strict';
 const keys='page panel inset rail railText railHover railSelected heading body muted line controlLine primary onPrimary soft focus statStrong statSoft chart2 chart3 overlay'.split(' ');
 const rows=[
  ['classic','Classic','White surfaces and crisp charcoal detail.','#F7F7F7 #FFFFFF #F5F5F5 #1D1D1D #E2E2E2 #353535 #FFFFFF #202020 #383838 #666666 #DEDEDE #8D8D8D #242424 #FFFFFF #F0F0F0 #555555 #FFFFFF #FFFFFF #5A7770 #8B7F72 #18181B33'],
  ['botanical','Botanical','Fresh greens and clean, natural surfaces.','#F7FAF5 #FFFFFF #F2F7EF #FFFFFF #365343 #EAF3E3 #D9F99D #10271A #294734 #5C6E61 #DCE5DB #778C7B #15552F #FFFFFF #EFF7E8 #27653F #FFFFFF #FFFFFF #689646 #7C8E62 #10271A33'],
  ["liquid-glass","Liquid Glass","Cool glass with soft depth and slate detail.","#E9EDF2 #FFFFFFE6 #E3E8EF #F5F7FAE6 #344155 #DBE2EB #FFFFFF #253247 #38475B #556276 #C9D1DD #7C8799 #3C526F #FFFFFF #E6ECF3 #3C526F #FFFFFFE6 #FFFFFFE6 #3F6D65 #796A83 #1B253D44"],
  ["graphite","Graphite","Deep charcoal, silver detail and clear type.","#17181B #222428 #2C2F35 #111215 #DADDE2 #30343B #F0F1F4 #F5F6F8 #DBDDE3 #B3B8C3 #3C414A #7F8795 #ECEEF2 #202226 #30343B #C8CFDC #222428 #222428 #87B4A2 #9FAED0 #00000099"],
  ["editorial","Editorial","Warm paper, rich ink and quiet brown accents.","#F1EEE8 #FFFCF7 #E8E2D7 #E8E3D9 #554C40 #D8D0C2 #FFFFFF #312B25 #4C443A #6B6153 #D9D0C4 #958675 #66503B #FFFFFF #EEE7DC #72533B #FFFCF7 #FFFCF7 #5A7967 #91714F #30271955"],
  ["porcelain","Porcelain","Soft stone with a subtle aubergine accent.","#F0EFF2 #FFFFFF #E7E5EA #E9E7EC #55505D #DCD8E2 #FFFFFF #302C36 #4D4756 #686172 #DAD6DF #918699 #64566F #FFFFFF #EEEAF2 #74617F #FFFFFF #FFFFFF #627A73 #8C7187 #29233055"],
  ["studio","Studio","White surfaces with a forest-green sidebar.","#EEF1ED #FFFFFF #E1E8DF #1E362C #E3EAE4 #314F40 #E2ECE4 #263C31 #3D5145 #566859 #CFDACF #819580 #315843 #FFFFFF #E6EDE3 #315843 #FFFFFF #FFFFFF #617F94 #947855 #1D362C55"]
 ];
 const THEMES=Object.freeze(rows.map(([id,name,description,values])=>{const tokens=Object.freeze(Object.fromEntries(keys.map((key,i)=>[key,values.split(' ')[i]])));return Object.freeze({id,name,description,accent:tokens.primary,dark:id==='graphite',...tokens,tokens});}));
 const aliases={'jova-blue':'classic','rose-studio':'liquid-glass','midnight-glass':'graphite',forest:'studio','warm-studio':'editorial',amethyst:'porcelain'};
 const byId=id=>THEMES.find(theme=>theme.id===(aliases[id]||id));
 const legacy={'#235789':'jova-blue','#77504e':'rose-studio','#286b64':'forest','#8bcf97':'forest','#6d4777':'amethyst','#2b221e':'warm-studio'};
 const cssKey=key=>'--theme-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
 function resolve(appearance){
  const value=typeof appearance==='string'?{theme:appearance}:appearance||{};
  if(typeof value.theme==='string'&&value.theme)return byId(value.theme)||THEMES[0];
  if(typeof value.id==='string'&&value.id)return byId(value.id)||THEMES[0];
  return byId(legacy[String(value.accent||'').toLowerCase()])||THEMES[0];
 }
 function apply(value){
  if(typeof document==='undefined')return;
  const theme=value==null?null:resolve(typeof value==='string'?value:{theme:value.id||value.theme,accent:value.accent});
  [document.documentElement,document.body].filter(Boolean).forEach(root=>{
   if(!theme){root.removeAttribute('data-workspace-theme');keys.forEach(key=>root.style.removeProperty(cssKey(key)));root.style.removeProperty('--workspace-accent');root.style.removeProperty('--workspace-on-accent');return;}
   root.setAttribute('data-workspace-theme',theme.id);
   keys.forEach(key=>root.style.setProperty(cssKey(key),theme[key]));
   root.style.setProperty('--workspace-accent',theme.primary);root.style.setProperty('--workspace-on-accent',theme.onPrimary);
  });
  return theme;
 }
 function choices(selected){
  const id=resolve(typeof selected==='string'?{theme:selected}:selected).id;
  return `<fieldset class="wt-choices"><legend class="wt-legend">Workspace theme</legend><div class="wt-choice-grid">${THEMES.filter(t=>t.id!=='porcelain').map(t=>`<label class="wt-choice"><input type="radio" name="theme" required value="${t.id}" ${id===t.id?'checked':''}><span class="wt-choice-card"><span class="wt-preview" aria-hidden="true" style="--preview-page:${t.page};--preview-panel:${t.panel};--preview-rail:${t.rail};--preview-primary:${t.primary};--preview-soft:${t.soft};--preview-ink:${t.heading};--preview-line:${t.line};--preview-strong:${t.statStrong}"><span class="wt-preview-rail"><i></i><i></i><i></i></span><span class="wt-preview-main"><span class="wt-preview-heading"></span><span class="wt-preview-stats"><i></i><i></i><i></i></span><span class="wt-preview-table"><i></i><i></i><i></i></span></span></span><span class="wt-choice-title">${t.name}<span class="wt-choice-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg></span></span><span class="wt-choice-description">${t.description}</span></span></label>`).join('')}</div></fieldset>`;
 }
 window.JovaWorkspaceThemes=Object.freeze({THEMES,resolve,apply,choices});
})();
