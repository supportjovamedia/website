"use client";
import { useId, useState } from "react";
import Link from "next/link";
import styles from "./GrowthSignup.module.css";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
export default function GrowthSignup({ newsletter = false }) {
 const whiteNewsletter = newsletter;
 const id=useId(); const [state,setState]=useState({busy:false,message:"",error:false,resourceUrl:null});
 async function submit(event){event.preventDefault();const form=event.currentTarget;const fields=new FormData(form);trackEvent("form_submit",{form_id:newsletter?"newsletter":"checklist"});setState({busy:true,message:"",error:false});
 try{const response=await fetch("/api/growth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:newsletter?"newsletter":"checklist",...(newsletter?{resource:"google-visibility"}:{}),email:fields.get("email"),name:fields.get("name")||"",website:fields.get("website")||""})});const result=await response.json();if(!response.ok)throw Error(result.error||"Please try again.");setState({busy:false,message:result.status==="already_subscribed"?"You’re already subscribed. Your checklist is ready below.":newsletter?"Check your inbox and confirm your email. Your checklist will be ready on the confirmation page.":"Your checklist is on its way. Check your inbox and spam folder.",error:false,resourceUrl:result.resourceUrl||null});if(result.status!=="already_subscribed")trackEvent(newsletter?"newsletter_confirmation_requested":"resource_request",{form_id:newsletter?"newsletter":"checklist"});form.reset();}catch(error){trackEvent("form_error",{form_id:newsletter?"newsletter":"checklist",error_stage:"delivery"});setState({busy:false,message:error.message||"We could not send that. Please try again.",error:true,resourceUrl:null});}}
 return <section id={newsletter?"growth-signup":undefined} className={`${styles.section} ${newsletter?styles.newsletter:styles.resource} ${whiteNewsletter ? styles.whiteNewsletter : ""}`} aria-labelledby={`${id}-title`}>
 <div className={newsletter?styles.newsletterCard:styles.contentGrid}>
 <div className={styles.signupCopy}>{newsletter&&<span className={styles.label}>Free Google visibility checklist</span>}<h2 id={`${id}-title`}>{newsletter?"Help customers find you.":"Is your digital presence costing you customers?"}</h2>{newsletter?<p>12 practical checks for your Google profile, website and booking link. <Link className={styles.inlineGuide} href="/resources#google-guides">Browse free guides</Link></p>:<><p>Get our practical checklist covering your website, search, social, content and conversion.</p><p className={styles.detail}>20 practical checks. Five areas to review. A simple plan for what to improve next.</p></>}</div>
 <form method="post" onSubmit={submit} className={styles.form} aria-busy={state.busy} data-analytics-form={newsletter?"newsletter":"checklist"} data-clarity-mask="true">
 {!newsletter&&<div><label htmlFor={`${id}-name`}>First name <span>(optional)</span></label><input id={`${id}-name`} name="name" autoComplete="given-name" maxLength={80}/></div>}
 <div><label htmlFor={`${id}-email`}>Email address</label><input id={`${id}-email`} type="email" name="email" autoComplete="email" maxLength={200} required/></div>
 <div className={styles.trap} aria-hidden="true"><label>Leave this blank<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 <button disabled={state.busy} type="submit">{state.busy?"Sending…":newsletter?"Send checklist":"Get the checklist"}</button>
 <p className={styles.privacy}>{newsletter?"Sign up for JovaMedia business growth tips and product updates. Confirm by email. Unsubscribe anytime.":"We’ll email your checklist. This does not sign you up for marketing."} <Link href="/privacy-policy">Privacy policy</Link></p>
 <p role={state.error?"alert":"status"} className={`${styles.message} ${state.error?styles.error:""}`}>{state.message}</p>
 {state.resourceUrl&&<Link className={styles.guideLink} href={state.resourceUrl}>Open your Google visibility checklist</Link>}
 </form></div></section>;
}
