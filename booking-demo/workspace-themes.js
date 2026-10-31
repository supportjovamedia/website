/* Owner-only themes: neutral working surfaces, controlled colour accents. */
(() => {
 'use strict';
 const keys='page panel inset rail railText railHover railSelected heading body muted line controlLine primary onPrimary soft focus statStrong statSoft chart2 chart3 overlay'.split(' ');
 const rows=[
  ['jova-blue','Jova Blue','JovaMedia blue accents on clean white.','#F5F5F5 #FFFFFF #EEEEEE #18334F #E7E7E7 #294966 #D3E3F4 #202020 #373737 #606060 #DDDDDD #8A8A8A #235789 #FFFFFF #E8EFF6 #1D5FA3 #FFFFFF #FFFFFF #4B7781 #8E6545 #00000066'],
  ['rose-studio','Rose Studio','Dusty rose accents on clean white.','#F5F5F5 #FFFFFF #EEEEEE #432B38 #E7E7E7 #624153 #F0CDD9 #202020 #373737 #606060 #DDDDDD #8A8A8A #954562 #FFFFFF #F5E9ED #A12F5D #FFFFFF #FFFFFF #6F7970 #8B6744 #00000066'],
  ['midnight-glass','Midnight Glass','Charcoal surfaces and clear neutral text.','#171717 #232323 #2C2C2C #101010 #D7D7D7 #303030 #D4D4D4 #F5F5F5 #E0E0E0 #B8B8B8 #414141 #858585 #E3E3E3 #202020 #343434 #DADADA #232323 #232323 #AEC9BB #D2C3AF #000000B3'],
  ['forest','Forest','Evergreen accents on clean white.','#F5F5F5 #FFFFFF #EEEEEE #203C31 #E7E7E7 #355548 #D1E4D3 #202020 #373737 #606060 #DDDDDD #8A8A8A #286B55 #FFFFFF #E8F1EB #186A4C #FFFFFF #FFFFFF #698195 #947449 #00000066'],
  ['warm-studio','Warm Studio','Espresso accents on clean white.','#F5F5F5 #FFFFFF #EEEEEE #352A23 #E7E7E7 #514137 #EAD5BD #202020 #373737 #606060 #DDDDDD #8A8A8A #78523B #FFFFFF #F2ECE6 #805129 #FFFFFF #FFFFFF #6D806C #587A94 #00000066'],
  ['amethyst','Amethyst','Muted violet accents on clean white.','#F5F5F5 #FFFFFF #EEEEEE #332B46 #E7E7E7 #4C3D65 #DFD2EF #202020 #373737 #606060 #DDDDDD #8A8A8A #6B528C #FFFFFF #EFEAF5 #73529D #FFFFFF #FFFFFF #52837C #92724C #00000066']
 ];
 const THEMES=Object.freeze(rows.map(([id,name,description,values])=>{const tokens=Object.freeze(Object.fromEntries(keys.map((key,i)=>[key,values.split(' ')[i]])));return Object.freeze({id,name,description,accent:tokens.primary,dark:id==='midnight-glass',...tokens,tokens});}));
 const byId=id=>THEMES.find(theme=>theme.id===id);
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
