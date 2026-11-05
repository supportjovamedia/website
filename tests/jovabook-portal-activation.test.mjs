import test from 'node:test';
import assert from 'node:assert/strict';
import {activatePortal} from '../scripts/activate-jovabook-portal.mjs';
import {offerPriceForId} from '../lib/jovabook-offer-catalog.mjs';

function fixture(){
 const env={JOVABOOK_OFFER_VERSION:'2026-11-free-v1',JOVABOOK_STRIPE_ACCOUNT_ID:'acct_1UP5eRRAVakCVqQ0',JOVABOOK_STRIPE_MODE:'live',JOVABOOK_STRIPE_OFFER_PORTAL_CONFIG:'bpc_1UYKWaRAVakCVqQ0rX4gaWqD',JOVABOOK_STRIPE_PRICE_PRO_SOLO:'price_Solo',JOVABOOK_STRIPE_PRICE_PRO_SOLO_ANNUAL:'price_SoloYear',JOVABOOK_STRIPE_PRICE_TEAM:'price_Team',JOVABOOK_STRIPE_PRICE_TEAM_ANNUAL:'price_TeamYear'};
 const writes=[];
 const stripe={accounts:{retrieveCurrent:async()=>({id:env.JOVABOOK_STRIPE_ACCOUNT_ID,charges_enabled:true})},prices:{retrieve:async id=>{const p=offerPriceForId(env,id);return {id,product:p.plan==='standard'?'prod_Solo':'prod_Team',active:true,livemode:true,currency:'gbp',recurring:{interval:p.interval,interval_count:1,usage_type:'licensed'},...(p.plan==='standard'?{billing_scheme:'per_unit',unit_amount:p.amount}:{billing_scheme:'tiered',tiers_mode:'graduated',tiers:[{up_to:1,flat_amount:p.amount,unit_amount:0},{up_to:null,flat_amount:0,unit_amount:p.cadence==='annual'?5760:600}]})};}},billingPortal:{configurations:{retrieve:async id=>({id,active:true,livemode:true}),update:async(id,body)=>{writes.push({id,body});return {id,...body};}}}};
 return {env,stripe,writes};
}

test('default is read-only and reports exactly four approved prices',async()=>{const f=fixture(),result=await activatePortal(f.env,f.stripe);assert.equal(f.writes.length,0);assert.equal(result.update.products.length,2);assert.equal(result.update.products.flatMap(p=>p.prices).length,4);assert.equal(result.update.trial_update_behavior,'continue_trial');});
test('explicit apply only updates the named portal and preserves the trial',async()=>{const f=fixture();assert.equal((await activatePortal(f.env,f.stripe,{apply:true})).configured,true);assert.equal(f.writes.length,1);assert.equal(f.writes[0].id,f.env.JOVABOOK_STRIPE_OFFER_PORTAL_CONFIG);assert.deepEqual(Object.keys(f.writes[0].body),['features']);assert.equal(f.writes[0].body.features.subscription_update.billing_cycle_anchor,'unchanged');});
test('wrong merchant or incorrect price prevents every write',async()=>{const f=fixture();f.stripe.accounts.retrieveCurrent=async()=>({id:'acct_Wrong',charges_enabled:true});await assert.rejects(activatePortal(f.env,f.stripe,{apply:true}),/merchant/);assert.equal(f.writes.length,0);const g=fixture(),retrieve=g.stripe.prices.retrieve;g.stripe.prices.retrieve=async id=>({...await retrieve(id),currency:'usd'});await assert.rejects(activatePortal(g.env,g.stripe,{apply:true}),/price/);assert.equal(g.writes.length,0);});
