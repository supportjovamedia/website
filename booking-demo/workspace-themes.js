/* Owner-only complete workspace palettes. Public booking branding is independent. */
(() => {
 'use strict';
 const keys='page panel inset rail railText railHover railSelected heading body muted line controlLine primary onPrimary soft focus statStrong statSoft chart2 chart3 overlay'.split(' ');
 const rows=[
  ['jova-blue','Jova Blue','Cool paper and confident JovaMedia blue.','#EEF3F8 #FFFFFF #E5EDF5 #18334F #C9D8E7 #294966 #D3E3F4 #172D43 #344B60 #526A80 #D3DFEA #7E93A8 #235789 #FFFFFF #D9E7F5 #1D5FA3 #1D4267 #CFDFEF #4B7781 #8E6545 #0C223A66'],
  ['rose-studio','Rose Studio','Soft rose, wine accents and a calm studio feel.','#F6EEF1 #FFFCFD #EEDFE5 #432B38 #E6CFD9 #624153 #F0CDD9 #402A35 #604451 #795967 #E5D1D9 #A37D8D #954562 #FFFFFF #F1D5DF #A12F5D #653449 #ECC5D3 #6F7970 #8B6744 #30131F66'],
  ['midnight-glass','Midnight Glass','An ink workspace with pale blue controls.','#111923 #1C2836 #14202D #0B121B #B9CCDE #27394C #A8C7E8 #F1F6FC #D6E1EE #A7B9CC #34465B #6E87A1 #A8C7E8 #142A41 #2A425B #C3DEFF #294B70 #30475A #83C7BE #DAB88C #030810B3'],
  ['forest','Forest','Evergreen details on fresh mineral paper.','#EDF2ED #FCFEFC #E0EAE1 #203C31 #C8DCCD #355548 #D1E4D3 #233C2F #405A48 #5B7262 #CDDDCF #7B9480 #286B55 #FFFFFF #D4E6D8 #186A4C #234B3B #CCDECB #698195 #947449 #112A1D66'],
  ['warm-studio','Warm Studio','Warm linen, espresso and inviting amber.','#F2ECE5 #FFFDFA #EAE0D4 #352A23 #E0D1C2 #514137 #EAD5BD #3B2D23 #594738 #76604D #DFD1C0 #A18B73 #78523B #FFFFFF #EAD8C2 #805129 #503C2D #E5D0B5 #6D806C #587A94 #2A1D1266'],
  ['amethyst','Amethyst','Quiet lilac with rich aubergine details.','#F0EEF6 #FDFBFF #E6E0EF #332B46 #D8CEE8 #4C3D65 #DFD2EF #342C45 #514660 #6E5E80 #DBD1E7 #9683A9 #6B528C #FFFFFF #E3D8F0 #73529D #49385F #D9CBE9 #52837C #92724C #20142F66']
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
  return `<fieldset class="wt-choices"><legend class="wt-legend">Workspace theme</legend><div class="wt-choice-grid">${THEMES.map(t=>`<label class="wt-choice"><input type="radio" name="theme" value="${t.id}" ${id===t.id?'checked':''}><span class="wt-choice-card"><span class="wt-preview" aria-hidden="true" style="--preview-page:${t.page};--preview-panel:${t.panel};--preview-rail:${t.rail};--preview-primary:${t.primary};--preview-soft:${t.statSoft};--preview-ink:${t.heading};--preview-line:${t.line};--preview-strong:${t.statStrong}"><span class="wt-preview-rail"><i></i><i></i><i></i></span><span class="wt-preview-main"><span class="wt-preview-heading"></span><span class="wt-preview-stats"><i></i><i></i><i></i></span><span class="wt-preview-table"><i></i><i></i><i></i></span></span></span><span class="wt-choice-title">${t.name}<span class="wt-choice-check" aria-hidden="true">✓</span></span><span class="wt-choice-description">${t.description}</span></span></label>`).join('')}</div></fieldset>`;
 }
 window.JovaWorkspaceThemes=Object.freeze({THEMES,resolve,apply,choices});
})();
