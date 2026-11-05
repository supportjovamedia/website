import {pathToFileURL} from 'node:url';
import {offerCatalogConfigured,offerPrice,validateOfferPrice} from '../lib/jovabook-offer-catalog.mjs';

// Run once during the approved release. This only configures the named portal.
// It cannot create a customer, subscription, invoice, charge or payment.
export async function activatePortal(env,stripe,{apply=false}={}){
 if(env.JOVABOOK_OFFER_VERSION!=='2026-11-free-v1'||env.JOVABOOK_STRIPE_ACCOUNT_ID!=='acct_1UP5eRRAVakCVqQ0'||env.JOVABOOK_STRIPE_MODE!=='live'||!offerCatalogConfigured(env)||env.JOVABOOK_STRIPE_OFFER_PORTAL_CONFIG!=='bpc_1UYKWaRAVakCVqQ0rX4gaWqD')throw Error('Unexpected release target.');
 const account=await stripe.accounts.retrieveCurrent();
 if(account.id!==env.JOVABOOK_STRIPE_ACCOUNT_ID||account.charges_enabled!==true)throw Error('Unexpected merchant.');
 const products=new Map();
 for(const plan of ['standard','premium'])for(const cadence of ['monthly','annual']){
  const approved=offerPrice(env,plan,cadence);
  const price=validateOfferPrice(await stripe.prices.retrieve(approved.id,{expand:['tiers']}),approved,'live');
  const product=typeof price.product==='string'?price.product:price.product?.id;
  if(!product?.startsWith('prod_'))throw Error('Missing product.');
  if(!products.has(product))products.set(product,[]);
  products.get(product).push(price.id);
 }
 const config=await stripe.billingPortal.configurations.retrieve(env.JOVABOOK_STRIPE_OFFER_PORTAL_CONFIG);
 if(!config.active||config.livemode!==true)throw Error('Unexpected portal.');
 const update={enabled:true,default_allowed_updates:['price','quantity'],proration_behavior:'always_invoice',billing_cycle_anchor:'unchanged',trial_update_behavior:'continue_trial',products:[...products].map(([product,prices])=>({product,prices}))};
 if(!apply)return {portal:config.id,update};
 const saved=await stripe.billingPortal.configurations.update(config.id,{features:{subscription_update:update}});
 const actual=saved.features?.subscription_update;
 if(!actual?.enabled||actual.trial_update_behavior!=='continue_trial'||actual.proration_behavior!=='always_invoice'||actual.billing_cycle_anchor==='now')throw Error('Portal update was not verified.');
 return {portal:saved.id,configured:true};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const Stripe=(await import('stripe')).default;
  const stripe=new Stripe(process.env.JOVABOOK_STRIPE_SECRET_KEY,{apiVersion:'2026-09-30.endive',maxNetworkRetries:0,timeout:15000});
  console.log(JSON.stringify(await activatePortal(process.env,stripe,{apply:process.argv.includes('--apply')})));
 }catch(error){console.error('JovaBook portal activation failed:',error.message);process.exitCode=1;}
}
