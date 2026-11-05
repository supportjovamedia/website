import {OFFER_VERSION} from './jovabook-offer.mjs';
import {offerCatalogConfigured,offerPrice,validateOfferPrice} from './jovabook-offer-catalog.mjs';

// A merge can build on Vercel without publishing an offer its backend cannot serve.
export async function verifyJovaBookRelease(env=process.env,{send=fetch,stripe:injected}={}){
 if(env.VERCEL_ENV!=='production')return {required:false};
 const blocked=()=>Error('JovaBook production release is not activated. Configure the approved Stripe prices and portal, apply the free-plan migration, then redeploy. The existing production deployment remains available.');
 if(env.JOVABOOK_OFFER_VERSION!==OFFER_VERSION||env.JOVABOOK_BILLING_ENABLED!=='true'||env.JOVABOOK_BILLING_APPROVED!=='true'||env.JOVABOOK_STRIPE_MODE!=='live'||!offerCatalogConfigured(env)||!env.JOVABOOK_STRIPE_SECRET_KEY||!/^acct_[A-Za-z0-9]+$/.test(env.JOVABOOK_STRIPE_ACCOUNT_ID||'')||!/^bpc_[A-Za-z0-9]+$/.test(env.JOVABOOK_STRIPE_OFFER_PORTAL_CONFIG||'')||!env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY||!/^[a-f0-9]{64}$/.test(env.JOVABOOK_BILLING_WORKER_TOKEN||''))throw blocked();
 try{
  const endpoint=new URL('/rest/v1/rpc/jovabook_offer_version',env.JOVABOOK_SUPABASE_URL);
  if(endpoint.protocol!=='https:')throw blocked();
  const response=await send(endpoint.href,{method:'POST',headers:{apikey:env.JOVABOOK_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok||await response.json()!==OFFER_VERSION)throw blocked();
  const booking=await send('https://book.jovamedia.com/config.js',{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!booking.ok||!(await booking.text()).includes(`window.JOVA_OFFER_VERSION="${OFFER_VERSION}"`))throw blocked();
  const stripe=injected||new (await import('stripe')).default(env.JOVABOOK_STRIPE_SECRET_KEY,{apiVersion:'2026-09-30.endive',maxNetworkRetries:0,timeout:5000});
  const merchant=await stripe.accounts.retrieveCurrent();
  if(merchant.id!==env.JOVABOOK_STRIPE_ACCOUNT_ID||merchant.charges_enabled!==true)throw blocked();
  await Promise.all(['standard','premium'].flatMap(plan=>['monthly','annual'].map(async cadence=>{const approved=offerPrice(env,plan,cadence);validateOfferPrice(await stripe.prices.retrieve(approved.id,{expand:['tiers']}),approved,'live');})));
  const config=await stripe.billingPortal.configurations.retrieve(env.JOVABOOK_STRIPE_OFFER_PORTAL_CONFIG),updates=config.features?.subscription_update;
  if(!config.active||config.livemode!==true||!updates?.enabled||updates.proration_behavior!=='always_invoice'||updates.billing_cycle_anchor==='now'||updates.trial_update_behavior!=='continue_trial'||!updates.default_allowed_updates?.includes('price')||!updates.default_allowed_updates?.includes('quantity'))throw blocked();
  const prices=new Set((updates.products||[]).flatMap(product=>product.prices||[]));
  for(const plan of ['standard','premium'])for(const cadence of ['monthly','annual'])if(!prices.has(offerPrice(env,plan,cadence).id))throw blocked();
  return {required:true,ready:true};
 }catch{throw blocked();}
}
