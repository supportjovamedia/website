import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signReceipt,readReceipt} from '../lib/booking/receipt.mjs';
import {parseDraft} from '../lib/booking/draft.mjs';

test('confirmation requires an unmodified receipt for this business and expires after one day',()=>{
 const secret='test-only-signing-key',now=Date.now(),receipt=signReceipt(42,1,secret,now);
 assert.equal(readReceipt(receipt,1,secret,now).bookingId,42);
 assert.equal(readReceipt(receipt,2,secret,now),null);
 assert.equal(readReceipt(receipt,1,'wrong-key',now),null);
 assert.equal(readReceipt(receipt,1,secret,now+86400001),null);
 const parts=receipt.split('.');parts[0]=Buffer.from(JSON.stringify({bookingId:43,businessId:1,expires:now+86400000})).toString('base64url');
 assert.equal(readReceipt(parts.join('.'),1,secret,now),null);
 assert.equal(readReceipt('42',1,secret,now),null);
});

test('sign-in selection drafts expire, reject another salon and never restore contact data',()=>{
 const now=Date.now(),value={slug:'salon',savedAt:now,serviceId:1,staff:'',date:'2026-10-12',slot:{staff_id:2,starts_at:'2026-10-12T09:00:00Z'},requestId:'4b562a97-6ea4-4c5b-8674-afaf020b3408',name:'Private name',email:'private@example.invalid'};
 const parsed=parseDraft(JSON.stringify(value),'salon',now);
 assert.equal(parsed.serviceId,1);assert.equal(parsed.slot.staff_id,2);
 assert.equal('email' in parsed,false);assert.equal('name' in parsed,false);
 assert.equal(parseDraft(JSON.stringify(value),'different',now),null);
 assert.equal(parseDraft(JSON.stringify(value),'salon',now+7200001),null);
 assert.equal(parseDraft('{broken','salon',now),null);
});
