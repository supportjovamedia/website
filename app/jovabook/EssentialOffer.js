"use client";
import {useState} from "react";
import s from "./jovabook.module.css";

export default function EssentialOffer(){
 const [cadence,setCadence]=useState("monthly"),annual=cadence==="annual",entry=`https://book.jovamedia.com/?portal=owner&plan=essential&cadence=${cadence}`;
 return <aside id="essential-plan" className={s.offer} aria-label="Essential plan"><h2>Essential</h2>
  <div className={s.cadence} role="group" aria-label="Billing frequency"><button type="button" aria-pressed={!annual} onClick={()=>setCadence("monthly")}>Monthly</button><button type="button" aria-pressed={annual} onClick={()=>setCadence("annual")}>Annual · save 20%</button></div>
  <p className={s.price}>{annual?"£192":"£20"}<span>{annual?" / year":" / month"}</span></p>
  {annual&&<p className={s.annual}>£192 paid upfront. £16 per month equivalent.</p>}
  <p className={s.commission}>+ 1% booking commission, billed monthly</p><p>On the full service price, counted in the monthly commission period when the appointment takes place.</p>
  <a className="btn" href={entry+"#signup"}>Get started with Essential</a><p className={s.note}>Create your business, then review your paid {annual?"annual":"monthly"} subscription before confirming. No automatic charge from this page.</p><a className={s.login} href={entry+"#login"}>Already have an account? Log in</a>
 </aside>;
}
