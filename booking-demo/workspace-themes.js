/* Owner-only themes: neutral working surfaces, controlled colour accents. */
(() => {
 'use strict';
 const keys='page panel inset rail railText railHover railSelected heading body muted line controlLine primary onPrimary soft focus statStrong statSoft chart2 chart3 overlay'.split(' ');
 const rows=[
  ['classic','Classic','Crisp white panels and familiar JovaMedia blue.','#F4F6F8 #FFFFFF #EDF2F6 #123653 #A6BFD0 #294966 #FFFFFF #172F40 #294355 #647C91 #E0E8EF #D9E4ED #235789 #FFFFFF #EAF3F9 #1D5FA3 #FFFFFF #FFFFFF #278E65 #7D4594 #12365366'],
  ['liquid-glass','Liquid Glass','Light-filled surfaces with translucent floating panels.','#E1EAFA #FFFFFFD9 #DDE8F4 #FFFFFFB8 #38536E #D3E2F1 #FFFFFF #254362 #36546F #536B89 #C6D6E7 #9BB4CD #3769AB #FFFFFF #EDF5FC #285994 #FFFFFFD9 #FFFFFFD9 #357D70 #8171A2 #203D6466'],
  ['graphite','Graphite','Matte charcoal, warm gold and clear contrast.','#1E2420 #292F2A #343C35 #171C18 #B1BAAD #353E35 #D6B366 #F3F1E7 #DFE4D9 #B1BAAD #414A40 #6C7969 #D6B366 #22291F #343E32 #E5C984 #292F2A #292F2A #8FB9A0 #B5A7C9 #000000B3'],
  ['editorial','Editorial','Warm paper, precise borders and editorial typography.','#F1EEE7 #F8F6EF #EAE4D9 #E8E2D7 #62584C #DDD4C7 #D9D0C1 #322E29 #4E473F #726B60 #D5CFC4 #B2A58F #6A5340 #FFFFFF #ECE5D9 #705039 #F8F6EF #F8F6EF #678271 #A47C52 #30271966'],
  ['porcelain','Porcelain','Soft sculpted panels with a subtle lilac finish.','#EAEAF1 #EAEAF1 #E2E2ED #E6E6EF #5C5873 #D8D5E5 #F5F5FA #3D3B54 #4B4961 #66637E #C9C7D8 #A7A0BD #71618E #FFFFFF #F3F1F8 #665181 #EAEAF1 #EAEAF1 #52837C #92724C #28243C66'],
  ['studio','Studio','A calm white workspace with an evergreen sidebar.','#EDF1EC #FFFFFF #E7EEE4 #214337 #D8E3D9 #36594A #E9EFE8 #254237 #3B5547 #607568 #D1DDD1 #AFC3B0 #375F4E #FFFFFF #E1EADF #2B654C #FFFFFF #FFFFFF #65859B #9A7959 #16392B66']
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
  return `<fieldset class="wt-choices"><legend class="wt-legend">Workspace theme</legend><div class="wt-choice-grid">${THEMES.map(t=>`<label class="wt-choice"><input type="radio" name="theme" value="${t.id}" ${id===t.id?'checked':''}><span class="wt-choice-card"><span class="wt-preview" aria-hidden="true" style="--preview-page:${t.page};--preview-panel:${t.panel};--preview-rail:${t.rail};--preview-primary:${t.primary};--preview-soft:${t.soft};--preview-ink:${t.heading};--preview-line:${t.line};--preview-strong:${t.statStrong}"><span class="wt-preview-rail"><i></i><i></i><i></i></span><span class="wt-preview-main"><span class="wt-preview-heading"></span><span class="wt-preview-stats"><i></i><i></i><i></i></span><span class="wt-preview-table"><i></i><i></i><i></i></span></span></span><span class="wt-choice-title">${t.name}<span class="wt-choice-check" aria-hidden="true">✓</span></span><span class="wt-choice-description">${t.description}</span></span></label>`).join('')}</div></fieldset>`;
 }
 window.JovaWorkspaceThemes=Object.freeze({THEMES,resolve,apply,choices});
})();
