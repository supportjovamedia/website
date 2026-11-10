// Fixed, non-identifying labels only. Never log credentials, account data or provider messages.
const reasons=new Set(['restore','login','google','signup','diary-before','diary-after','save-verify','manual-refresh','billing-refresh','access-deadline','record-page']);
const stages=new Set(['input','auth-user','access-initial','billing-context','merchant','reconcile','access-final','commission','complete']);
const clientVersion='20261110-record-pages';
export function accessDiagnostic(request,emit=()=>{},now=Date.now){
 const started=now(),reason=request.headers.get('x-jovabook-access-reason'),client=request.headers.get('x-jovabook-client');let stage='input',finished=false;
 return {
  stage(value){if(stages.has(value))stage=value;},
  finish(response,problem){
   if(finished)return response;finished=true;
   const status=response.status,code=status<400?'ok':problem?.code==='billing_sync_stale'?'billing_sync_stale':['AbortError','TimeoutError'].includes(problem?.name)?'timeout':Number.isInteger(problem?.upstreamStatus)?'upstream_http':status===401||status===403?'denied':status<500?'invalid_request':'unavailable';
   const record={event:'jovabook_access_status',reason:reasons.has(reason)?reason:'unknown',client:client===clientVersion?clientVersion:'unknown',stage:status<400?'complete':stage,status,code,elapsed_ms:Math.max(0,Math.round(now()-started))};
   if(Number.isInteger(problem?.upstreamStatus)&&problem.upstreamStatus>=100&&problem.upstreamStatus<=599)record.upstream_status=problem.upstreamStatus;
   try{emit(record);}catch{}return response;
  }
 };
}
