import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {db, rows} from '../lib/booking/server.mjs';
import {deploymentBusiness} from '../lib/booking/business.mjs';

const origin = process.env.TEST_URL || 'http://127.0.0.1:3100';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local verification only');
const credentials = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const c = db(), base = origin + '/preview/booking/api/';
async function call(path, body, cookie) {
  const response = await fetch(base + path, {method: body ? 'POST' : 'GET', headers: {...(body ? {'Content-Type': 'application/json', Origin: origin} : {}), ...(cookie ? {Cookie: cookie} : {})}, body: body ? JSON.stringify(body) : undefined});
  return {status: response.status, data: await response.json(), cookie: response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')};
}
const owner = await call('auth/login', credentials['north.owner']);
assert.equal(owner.status, 200);
const catalog = await call('public/catalog');
const salon = await deploymentBusiness(c), business_id = salon.id;
assert.equal(catalog.data.categories.length, 3);
assert(catalog.data.categories.every(category => catalog.data.services.filter(service => service.category_id === category.id).length === 2));
const suffix = randomUUID();
const categories = [], services = [];
try {
  assert.equal((await call('categories', { name: 'Rejected category'})).status, 401);
  const customer = await call('auth/login', {username:credentials['customer.demo'].email,password:credentials['customer.demo'].password});
  assert.equal(customer.status, 200, JSON.stringify(customer.data));
  assert.equal((await call('categories', { name: 'Rejected customer category'}, customer.cookie)).status, 403);
  const created = await call('categories', { name: 'QA ' + suffix, sort_order: 15}, owner.cookie);
  assert.equal(created.status, 200, JSON.stringify(created.data)); categories.push(created.data.id);
  const renamed = await call('categories', { id: created.data.id, name: 'QA renamed ' + suffix, sort_order: 20}, owner.cookie);
  assert.equal(renamed.status, 200); assert.equal(renamed.data.sort_order, 20);
  assert.equal((await call('categories', { name: 'qa RENAMED ' + suffix}, owner.cookie)).status, 409);
  const service = await call('services', { category_id: created.data.id, name: 'QA service ' + suffix, price_pence: 1200, duration_minutes: 20, buffer_minutes: 5, active: false}, owner.cookie);
  assert.equal(service.status, 200); services.push(service.data.id);
  let foreign=null;
  if(!salon.single){
    foreign=await rows(c.from('service_categories').insert({business_id: credentials['willow.owner'].business_id,name:'QA foreign '+suffix}).select().single());
    categories.push(foreign.id);
  }
  assert.equal((await call('services',{...service.data,category_id:foreign?.id||999999999},owner.cookie)).status,400);
  const dashboard = await call('dashboard', null, owner.cookie);
  assert(dashboard.data.categories.some(category => category.id === created.data.id));
  assert(!dashboard.data.categories.some(category => category.id === foreign?.id));
  const publicCatalog = await call('public/catalog');
  assert(!publicCatalog.data.services.some(item => item.id === service.data.id));
  assert(!publicCatalog.data.categories.some(item => item.id === foreign?.id));
  const scoped = db();
  const signed = await scoped.auth.signInWithPassword({email: credentials['north.owner'].email, password: credentials['north.owner'].password});
  assert(!signed.error);
  if(foreign){
    const hidden=await scoped.from('service_categories').select('id').eq('id',foreign.id);
    assert(!hidden.error);assert.equal(hidden.data.length,0);
    const forbidden=await scoped.from('service_categories').insert({business_id:foreign.business_id,name:'QA forbidden '+suffix});assert(forbidden.error);
  }else{
    const current=await scoped.from('service_categories').select('id');assert(!current.error);assert(current.data.length>=3);
    const anonymous=db();await anonymous.auth.signInWithPassword({email:credentials['customer.demo'].email,password:credentials['customer.demo'].password});
    const hidden=await anonymous.from('service_categories').select('id');assert(!hidden.error);assert.equal(hidden.data.length,0);
  }
  console.log('PASS: category create/rename/order, case-insensitive duplicate protection, service assignment, database category foreign key, owner-only API, RLS and public catalogue.');
} finally {
  if (services.length) await rows(c.from('services').delete().in('id', services));
  if (categories.length) await rows(c.from('service_categories').delete().in('id', categories));
}
