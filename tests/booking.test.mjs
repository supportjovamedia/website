import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const origin=process.env.TEST_URL||'http://localhost:3100';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Local tests only');
const base=origin+'/preview/booking';

test('booking deployment exposes one salon and rejects a different salon on every public API',async()=>{
 const businesses=await(await fetch(base+'/api/public/businesses')).json();
 assert.equal(businesses.length,1);
 const catalog=await(await fetch(base+'/api/public/catalog')).json();
 assert.equal(catalog.business.id,businesses[0].id);
 assert(catalog.services.length);
 assert.equal((await fetch(base+'/api/public/catalog?slug=other-salon')).status,404);
 const foreignId=catalog.business.id+1;
 assert.equal((await fetch(base+`/api/public/slots?business=${foreignId}&service=1&date=2030-01-01`)).status,404);
 const rejected=await fetch(base+'/api/public/book',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({business_id:foreignId,service_id:1,staff_id:1,starts_at:'2030-01-01T10:00:00Z',request_id:randomUUID(),name:'Rejected test',email:'test@example.invalid',phone:''})});
 assert.equal(rejected.status,404);
});

test('customer and admin have separate pages and anonymous callers cannot access private data',async()=>{
 for(const path of ['','/account','/admin'])assert.equal((await fetch(base+path)).status,200);
 for(const path of ['me','customer/me','dashboard?business=1'])assert.equal((await fetch(base+'/api/'+path)).status,401);
});
