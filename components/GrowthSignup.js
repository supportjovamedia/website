"use client";
import { useId, useState } from "react";
import Link from "next/link";
import styles from "./GrowthSignup.module.css";
export default function GrowthSignup({ newsletter = false }) {
 const id=useId(); const [state,setState]=useState({busy:false,message:"",error:false});
 async function submit(event){event.preventDefault();const form=event.currentTarget;const fields=new FormData(form);setState({busy:true,message:"",error:false});
 try{const response=await fetch("/api/growth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:newsletter?"newsletter":"checklist",email:fields.get("email"),name:fields.get("name")||"",website:fields.get("website")||""})});const result=await response.json();if(!response.ok)throw Error(result.error||"Please try again.");setState({busy:false,message:newsletter?"Check your inbox to confirm your subscription. You are not subscribed until you confirm.":"Your checklist is on its way. Check your inbox and spam folder.",error:false});form.reset();}catch(error){setState({busy:false,message:error.message||"We could not send that. Please try again.",error:true});}}
 return <section className={`${styles.section} ${newsletter?styles.newsletter:styles.resource}`} aria-labelledby={`${id}-title`}>
 <div><p className={styles.label}>{newsletter?"GOOD DIGITAL THINKING, OCCASIONALLY.":"FREE DIGITAL GROWTH CHECKLIST"}</p><h2 id={`${id}-title`}>{newsletter?"A little perspective for your inbox.":"Is your digital presence costing you customers?"}</h2><p>{newsletter?"Useful ideas on growth, creative, media and technology. No spam.":"Get our practical checklist covering your website, search, social, content and conversion."}</p>{!newsletter&&<p className={styles.detail}>20 practical checks. Five areas to review. A simple plan for what to improve next.</p>}</div>
 <form onSubmit={submit} className={styles.form} aria-busy={state.busy}>
 {!newsletter&&<div><label htmlFor={`${id}-name`}>First name <span>(optional)</span></label><input id={`${id}-name`} name="name" autoComplete="given-name" maxLength={80}/></div>}
 <div><label htmlFor={`${id}-email`}>Email address</label><input id={`${id}-email`} type="email" name="email" autoComplete="email" maxLength={200} required/></div>
 <div className={styles.trap} aria-hidden="true"><label>Leave this blank<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 <button disabled={state.busy} type="submit">{state.busy?"Sending…":newsletter?"Subscribe":"Get the checklist"}</button>
 <p className={styles.privacy}>{newsletter?"By subscribing, you agree to receive JovaMedia marketing emails. Confirm by email; unsubscribe anytime.":"We’ll email your checklist. This does not sign you up for marketing."} <Link href="/privacy-policy">Privacy policy</Link></p>
 <p role={state.error?"alert":"status"} className={`${styles.message} ${state.error?styles.error:""}`}>{state.message}</p>
 </form></section>;
}
