const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const fail=(message,status,field='')=>reply({ok:false,field,message},status);

export function createSignupHandler({createClient,env}){
 return async request=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return fail('POST only.',405);
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if(!token)return fail('Log in with your verified account before creating a business.',401);
  const url=env('SUPABASE_URL'),key=env('SUPABASE_ANON_KEY')||env('SB_PUBLISHABLE_KEY');
  if(!url||!key)return fail('Business creation is temporarily unavailable. Please try again later.',503);
  const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try{
   const {data,error}=await db.auth.getUser(token),user=data?.user;
   if(error||!user?.id||typeof user.email!=='string')return fail('Log in again before creating your business.',401);
   if(!Number.isFinite(Date.parse(user.email_confirmed_at||'')))return fail('Verify your email, then log in before creating your business.',403);
   let body;try{body=await request.json();}catch{return fail('Enter your business details and try again.',400);}
   if(!body||Array.isArray(body)||Object.keys(body).some(key=>!['name','slug','owner'].includes(key))||['name','slug','owner'].some(key=>typeof body[key]!=='string'))return fail('Only business details are accepted. Your account identity comes from your verified login.',400);
   const name=String(body.name||'').trim(),slug=String(body.slug||'').trim().toLowerCase(),owner=String(body.owner||'').trim();
   if(!name||name.length>60)return fail('Enter a business name up to 60 characters.',400,'name');
   if(slug.length<3||slug.length>30||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return fail('Use 3 to 30 letters, numbers or hyphens.',400,'slug');
   if(!owner||owner.length>80)return fail('Enter your name, up to 80 characters.',400,'owner');
   const result=await db.rpc('create_business_for_existing_user',{p_name:name,p_slug:slug,p_owner:owner});
   if(result.error)return fail('We could not create your business. Log in or choose another booking address.',409);
   if(result.data?.ok!==true)return reply({ok:false,field:result.data?.field||'',message:result.data?.message||'We could not create your business. Please try again.'},409);
   return reply(result.data);
  }catch{return fail('Business creation is temporarily unavailable. Please try again later.',503);}
 };
}
