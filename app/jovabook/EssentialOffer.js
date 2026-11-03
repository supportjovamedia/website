"use client";

import {useState} from 'react';
import {Check,X} from 'lucide-react';
import s from './story.module.css';
import {jovabookMarketingPlans as plans,jovabookComparisonRows as rows,jovabookSignupHref} from "@/lib/jovabook-marketing-plans.mjs";
function Value({value}){return typeof value==='boolean'?value?<><Check size={20} aria-hidden="true"/><span className={s.srOnly}>Included</span></>:<><X size={20} aria-hidden="true"/><span className={s.srOnly}>Not included</span></>:value;}
function PlanHeading({plan,annual,entry}){return <>
 {plan.recommended&&<span className={s.popularLabel}>Most popular</span>}<h3>{plan.name}</h3><p className={s.tablePlanDescription}>{plan.description}</p><div className={s.tablePrice} aria-live="polite" aria-atomic="true"><strong>£{annual?plan.equivalent:plan.monthly}</strong><span>/month</span></div><p className={s.tableBilled}>{annual?`£${plan.annual} billed yearly`:'Billed monthly'}</p><p className={s.tableCommission}>{plan.commission?'1% commission on online customer bookings':'0% booking commission'}</p>
 <a className={plan.recommended?s.primaryButton:s.planButton} href={entry}>Start free trial</a>
 </>;}
export default function EssentialOffer(){
 const[cadence,setCadence]=useState('monthly');const annual=cadence==='annual';const entry=plan=>jovabookSignupHref(plan.id,cadence);
 return <div id="essential-plan" className={s.comparisonOffer}>
  <div className={s.billingBar}><div className={s.cadence} role="group" aria-label="Billing frequency"><button type="button" aria-pressed={!annual} onClick={()=>setCadence('monthly')}>Monthly</button><button type="button" aria-pressed={annual} onClick={()=>setCadence('annual')}>Yearly <span>Save 20%</span></button></div><a href="https://book.jovamedia.com/login">Log in to JovaBook</a></div>
  <div role="region" aria-label="JovaBook plans">
   <div className={`${s.comparisonScroll} ${s.desktopPlanComparison}`} tabIndex={0}><table className={s.comparisonTable}><caption className={s.srOnly}>JovaBook prices and included features</caption><colgroup><col className={s.featureColumn}/><col/><col className={s.recommendedColumn}/><col/></colgroup><thead><tr>
    <th scope="col" className={s.comparisonIntro}>Included with your plan</th>
    {plans.map(plan=><th scope="col" key={plan.name} className={`${s.tablePlanHead} ${plan.recommended?s.recommendedPlanHead:''}`}><PlanHeading plan={plan} annual={annual} entry={entry(plan)}/></th>)}
   </tr></thead><tbody>{rows.map(([name,values])=><tr key={name}><th scope="row">{name}</th>{values.map((value,i)=><td key={i}><span className={s.featureValue}><Value value={value}/></span></td>)}</tr>)}</tbody></table></div>
   <div className={s.mobilePlanCards}>{plans.map((plan,index)=><article key={plan.name} className={`${s.mobilePlan} ${plan.recommended?s.mobileRecommendedPlan:''}`} aria-label={`${plan.name} plan`}><header className={s.mobilePlanHeading}><PlanHeading plan={plan} annual={annual} entry={entry(plan)}/></header><dl className={s.mobilePlanFeatures}>{rows.map(([name,values])=><div key={name}><dt>{name}</dt><dd><Value value={values[index]}/></dd></div>)}</dl></article>)}</div>
  </div>
 </div>;
}
