export const draftKey=slug=>'booking-selection:'+slug;

// Only selection data belongs in this short-lived draft, never contact details.
export function parseDraft(raw,slug,now=Date.now()){
 try{
  const v=JSON.parse(raw);
  if(v.slug!==slug||!Number.isFinite(v.savedAt)||now-v.savedAt>7200000||v.savedAt>now+60000)return null;
  if(!Number.isSafeInteger(v.serviceId)||!Number.isSafeInteger(v.slot?.staff_id)||!Number.isFinite(Date.parse(v.slot.starts_at)))return null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(v.requestId))return null;
  return {serviceId:v.serviceId,staff:String(v.staff||''),date:v.date,slot:{staff_id:v.slot.staff_id,starts_at:v.slot.starts_at},requestId:v.requestId,guest:v.guest===true};
 }catch{return null;}
}
