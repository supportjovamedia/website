import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
const reply=(status,body)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const key=secret=>createHash("sha256").update(secret).digest();
export function seal(data,secret){const iv=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",key(secret),iv);return Buffer.concat([iv,cipher.update(JSON.stringify(data)),cipher.final(),cipher.getAuthTag()]).toString("base64url");}
export function unseal(token,secret,now=Date.now()){try{const b=Buffer.from(token,"base64url");const decipher=createDecipheriv("aes-256-gcm",key(secret),b.subarray(0,12));decipher.setAuthTag(b.subarray(-16));const data=JSON.parse(Buffer.concat([decipher.update(b.subarray(12,-16)),decipher.final()]));if(data.purpose!=="newsletter"||!Number.isFinite(data.expires)||data.expires<now)throw Error();return data;}catch{throw Error("This confirmation link is invalid or has expired. Please subscribe again.");}}
export function createGrowthHandler({env=process.env,send=fetch,now=Date.now}={}){
 const attempts=new Map();
 return async function POST(request){
 const origin=request.headers.get("origin");if(origin!==new URL(request.url).origin)return reply(403,{error:"Please use the form on our website."});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return reply(415,{error:"Invalid request format."});
 let data;try{const reader=request.body.getReader();let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply(413,{error:"The request is too large."});}chunks.push(value);}data=JSON.parse(Buffer.concat(chunks).toString());}catch{return reply(400,{error:"Please check the form and try again."});}
 if(!data||!["checklist","newsletter","confirm"].includes(data.kind))return reply(400,{error:"Invalid request."});
 if(!env.RESEND_API_KEY||!env.RESOURCE_FROM_EMAIL||!env.SITE_URL||(data.kind!=="checklist"&&(!env.NEWSLETTER_TOKEN_SECRET||env.NEWSLETTER_TOKEN_SECRET.length<32||!env.RESEND_NEWSLETTER_SEGMENT_ID)))return reply(503,{error:"Email delivery is not available yet. Please try again later."});
 let base;try{base=new URL(env.SITE_URL);if(base.protocol!=="https:"&&base.hostname!=="localhost")throw Error();}catch{return reply(503,{error:"Email delivery is not available yet."});}
 const ip=createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown").digest("hex");
 const time=now();for(const [k,v] of attempts)if(time-v.start>600000)attempts.delete(k);
 const entry=attempts.get(ip)||{start:time,count:0};if(entry.count>=8)return reply(429,{error:"Please wait ten minutes before trying again."});entry.count++;if(attempts.size>2000)attempts.delete(attempts.keys().next().value);attempts.set(ip,entry);
 const api=async(path,method,body,idem)=>{const res=await send("https://api.resend.com"+path,{method,headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json",...(idem?{"Idempotency-Key":idem}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});return {status:res.status,ok:res.ok,data:await res.json()};};
 try{
 if(data.kind==="confirm"){
 if(typeof data.token!=="string"||data.token.length>2000)return reply(400,{error:"Invalid confirmation link."});
 let contact;try{contact=unseal(data.token,env.NEWSLETTER_TOKEN_SECRET,time);}catch(error){return reply(400,{error:error.message});}
 const existing=await api("/contacts/"+encodeURIComponent(contact.email),"GET");
 if(existing.ok){if(existing.data.unsubscribed)return reply(409,{error:"This address previously unsubscribed. Please contact us if you want to rejoin; this link will not override your preference."});
 const recorded=await api("/contacts/"+existing.data.id,"PATCH",{properties:{newsletter_consent_at:new Date(time).toISOString(),newsletter_consent_version:"footer-v1"}});if(!recorded.ok)throw Error();
 const added=await api(`/contacts/${existing.data.id}/segments/${env.RESEND_NEWSLETTER_SEGMENT_ID}`,"POST");if(!added.ok)throw Error();
 }else if(existing.status===404){const created=await api("/contacts","POST",{email:contact.email,unsubscribed:false,segments:[{id:env.RESEND_NEWSLETTER_SEGMENT_ID}],properties:{newsletter_consent_at:new Date(time).toISOString(),newsletter_consent_version:"footer-v1"}});if(!created.ok)throw Error();}else throw Error();
 return reply(200,{ok:true});
 }
 if(typeof data.email!=="string"||data.email.length>200||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)||typeof data.name!=="string"||data.name.length>80||/[\r\n]/.test(data.name)||data.website)return reply(400,{error:"Please enter a valid email address."});
 const email=data.email.trim().toLowerCase();const first=data.name.trim();let subject,text;
 if(data.kind==="checklist"){subject="Your JovaMedia Digital Growth Checklist";text=`${first?"Hi "+first+",":"Hello,"}\n\nHere is the Digital Growth Checklist you requested:\n${new URL("/resources/digital-growth-checklist.pdf",base).href}\n\nReview your website, search, social, content and conversion, then choose your next three improvements.\n\nYou have not been subscribed to marketing.\n\nJovaMedia\n${new URL("/contact",base).href}`;}
 else{const token=seal({purpose:"newsletter",email,expires:time+86400000},env.NEWSLETTER_TOKEN_SECRET);subject="Confirm your JovaMedia newsletter subscription";text=`Please confirm that you want occasional JovaMedia ideas on growth, creative, media and technology.\n\n${new URL("/newsletter/confirm",base).href}#${token}\n\nOpen the link and select Confirm subscription. It expires in 24 hours. If you did not request this, ignore this email; you will not be subscribed. You can unsubscribe from every newsletter.`;}
 const idem="growth-"+createHash("sha256").update(data.kind+email+text+Math.floor(time/600000)).digest("hex");
 // A stable body is needed for retries within the idempotency window; newsletter tokens are random, so use their hash.
 const result=await api("/emails","POST",{from:env.RESOURCE_FROM_EMAIL,to:[email],subject,text},data.kind==="checklist"?idem:undefined);
 if(!result.ok||!result.data.id)throw Error();return reply(200,{ok:true});
 }catch{return reply(502,{error:"We could not complete that request. Please try again shortly."});}
 };
}
