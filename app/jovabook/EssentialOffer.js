"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import s from "./story.module.css";
const plans=[{name:'Essential',monthly:20,annual:192,equivalent:16,commission:1,description:'For your own diary.',available:true},{name:'Standard',monthly:50,annual:480,equivalent:40,commission:1,description:'For a growing team.',recommended:true},{name:'Premium',monthly:100,annual:960,equivalent:80,commission:0,description:'More room to grow.'}];
const rows=[['People taking bookings',['1 owner','Up to 5 staff','Up to 10 staff']],['Online booking and calendar',[true,true,true]],['Clients and services',[true,true,true]],['Your business website',['One page','One page','Multi-page']],['Email confirmations and reminders',[true,true,true]],['Individual staff hours',[false,true,true]],['Business Insights',[false,true,true]],['Insights period comparisons',[false,false,true]],['Remove Powered by JovaMedia',[false,false,true]]];
function Value({value}){return typeof value==='boolean'?value?<><Check size={20} aria-hidden="true"/><span className={s.srOnly}>Included</span></>:<><Minus size={17} aria-hidden="true"/><span className={s.srOnly}>Not included</span></>:value;}
export default function EssentialOffer(){
 const[cadence,setCadence]=useState('monthly');const annual=cadence==='annual';const entry=`https://book.jovamedia.com/?portal=owner&plan=essential&cadence=${cadence}`;
 return <div id="essential-plan" className={s.comparisonOffer}>
  <div className={s.billingBar}><div className={s.cadence} role="group" aria-label="Billing frequency"><button type="button" aria-pressed={!annual} onClick={()=>setCadence('monthly')}>Monthly</button><button type="button" aria-pressed={annual} onClick={()=>setCadence('annual')}>Yearly <span>Save 20%</span></button></div><a href="https://book.jovamedia.com/?portal=owner#login">Log in to JovaBook</a></div>
  <div className={s.comparisonScroll} tabIndex={0} role="region" aria-label="JovaBook plans"><table className={s.comparisonTable}><caption className={s.srOnly}>JovaBook prices and included features</caption><colgroup><col className={s.featureColumn}/><col/><col className={s.recommendedColumn}/><col/></colgroup><thead><tr>
   <th scope="col" className={s.comparisonIntro}>Included with your plan</th>
   {plans.map(plan=><th scope="col" key={plan.name} className={`${s.tablePlanHead} ${plan.recommended?s.recommendedPlanHead:''}`}>
    {plan.recommended&&<span className={s.popularLabel}>Most popular</span>}<h3>{plan.name}</h3><p className={s.tablePlanDescription}>{plan.description}</p><div className={s.tablePrice} aria-live="polite" aria-atomic="true"><strong>£{annual?plan.equivalent:plan.monthly}</strong><span>/month</span></div><p className={s.tableBilled}>{annual?`£${plan.annual} billed yearly`:'Billed monthly'}</p><p className={s.tableCommission}>{plan.commission?'+ 1% booking commission':'0% booking commission'}</p>
    {plan.available?<a className={s.primaryButton} href={`${entry}#signup`}>Try JovaBook for free</a>:<Link className={s.planButton} href={`/contact?subject=JovaBook%20${plan.name}`}>Talk about {plan.name}</Link>}
   </th>)}
  </tr></thead><tbody>{rows.map(([name,values])=><tr key={name}><th scope="row">{name}</th>{values.map((value,i)=><td key={i}><span className={s.featureValue}><Value value={value}/></span></td>)}</tr>)}</tbody></table></div>
 </div>;
}
