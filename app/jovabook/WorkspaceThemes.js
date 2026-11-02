"use client";
import {useState} from "react";
import ProductScreen from "./ProductScreen";
import s from "./story.module.css";
const themes=[['jova-blue','Jova Blue','#235789'],['rose-studio','Rose Studio','#954562'],['midnight-glass','Midnight Glass','#242424'],['forest','Forest','#286b55'],['warm-studio','Warm Studio','#78523b'],['amethyst','Amethyst','#6b528c']];
function tilt(event){if(!matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)').matches)return;const box=event.currentTarget.getBoundingClientRect(),x=(event.clientX-box.left)/box.width-.5,y=(event.clientY-box.top)/box.height-.5;event.currentTarget.style.setProperty('--tilt-x',`${-y*4}deg`);event.currentTarget.style.setProperty('--tilt-y',`${x*4}deg`)}
function reset(event){event.currentTarget.style.setProperty('--tilt-x','0deg');event.currentTarget.style.setProperty('--tilt-y','0deg')}
export default function WorkspaceThemes(){
 const [selected,setSelected]=useState(0);const [id,name]=themes[selected];
 return <section className={s.themeShowcase} aria-labelledby="workspace-theme-title" data-story-row>
  <div className={s.themeIntro} data-story-copy><h2 id="workspace-theme-title">Choose how your workspace looks.</h2><p>Pick from six styles, including Jova Blue, Rose Studio and a dark workspace. The colour carries through your navigation, buttons and charts, while your booking page keeps its own branding.</p></div>
  <div className={s.themeChoices} role="group" aria-label="Preview workspace colours">{themes.map(([key,label,colour],index)=><button type="button" key={key} aria-pressed={selected===index} onClick={()=>setSelected(index)}><span style={{background:colour}} aria-hidden="true"/>{label}</button>)}</div>
  <div className={s.themePanel} data-story-visual onPointerMove={tilt} onPointerLeave={reset} onPointerCancel={reset}><div className={s.themeDepth}><ProductScreen key={id} name={`theme-${id}`} label={`${name} workspace`} alt={`Actual JovaBook dashboard in the ${name} workspace theme`} width={2880} height={1920} sizes="(max-width: 800px) 100vw, 1090px" caption={false}/></div></div>
 </section>;
}
