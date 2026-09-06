import { createHash } from "node:crypto";
const reply = (status, body) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export function createContactHandler({ env = process.env, send = fetch, now = Date.now } = {}) {
  const attempts = new Map();
  return async function POST(request) {
    if (!env.RESEND_API_KEY || !env.CONTACT_FROM_EMAIL || !env.CONTACT_TO_EMAIL)
      return reply(503, { ok:false, error:"Sending is temporarily unavailable. Please email us directly." });
    const origin = request.headers.get("origin");
    const allowed = new Set([new URL(request.url).origin, "https://www.jovamedia.com", "https://jovamedia.com"]);
    if (!origin || !allowed.has(origin)) return reply(403, {ok:false,error:"Please send your enquiry from our website."});
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return reply(415,{ok:false,error:"Invalid request format."});
    let data;
    try {
      const reader=request.body?.getReader(); if(!reader)throw Error();
      let size=0;const chunks=[];
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();return reply(413,{ok:false,error:"Your enquiry is too long."});}chunks.push(value);}
      data=JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch { return reply(400,{ok:false,error:"Please check your enquiry and try again."}); }
    if (!data || typeof data !== "object" || Array.isArray(data)) return reply(400,{ok:false,error:"Invalid enquiry."});
    const limits={name:100,email:200,company:150,service:100,timing:100,message:3000};
    const values={};
    for(const [key,max] of Object.entries(limits)){
      if(typeof data[key]!=="string" || data[key].length>max)return reply(400,{ok:false,error:"Please check the form fields."});
      values[key]=data[key].trim();
    }
    if(!values.name || values.message.length<10 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(values.email) || /[\r\n]/.test(values.name+values.email+values.company) || data.website)
      return reply(400,{ok:false,error:"Please check your name, email address and message."});
    const requestId=request.headers.get("idempotency-key");
    if(!/^[a-f0-9-]{36}$/i.test(requestId||""))return reply(400,{ok:false,error:"Please refresh the page and try again."});
    const time=now();
    for(const [key,entry] of attempts)if(time-entry.start>600000)attempts.delete(key);
    const ip=createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown").digest("hex");
    const entry=attempts.get(ip)||{start:time,count:0,ids:new Set()};
    if(!entry.ids.has(requestId)){
      if(entry.count>=5)return reply(429,{ok:false,error:"Too many attempts. Please wait a few minutes before trying again."});
      entry.count++;entry.ids.add(requestId);if(attempts.size>=2000)attempts.delete(attempts.keys().next().value);attempts.set(ip,entry);
    }
    const payload={from:env.CONTACT_FROM_EMAIL,to:[env.CONTACT_TO_EMAIL],reply_to:values.email,subject:"New JovaMedia website enquiry",text:
      `Name: ${values.name}\nEmail: ${values.email}\nCompany: ${values.company||"Not provided"}\nInterested in: ${values.service}\nTiming: ${values.timing}\n\n${values.message}`};
    const key="enquiry-"+createHash("sha256").update(requestId+JSON.stringify(values)).digest("hex");
    try {
      const response=await send("https://api.resend.com/emails",{
        method:"POST",headers:{"Authorization":`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":key},
        body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)
      });
      const result=await response.json();
      if(!response.ok || typeof result.id!=="string" || !result.id)return reply(502,{ok:false,error:"We could not confirm your enquiry was received. Please try again or email us directly."});
      return reply(200,{ok:true});
    } catch {return reply(502,{ok:false,error:"We could not confirm your enquiry was received. Please try again or email us directly."});}
  };
}
