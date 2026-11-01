import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../booking-demo/public-entry.js', import.meta.url), 'utf8');
function visit(path, {owner = false, auth = false, blockedStorage = false, hostname = 'book.jovamedia.com'} = {}) {
  const url = new URL(path, `https://${hostname}`), redirects = [];
  const location = {hostname, pathname:url.pathname, search:url.search, hash:url.hash, replace:value=>redirects.push(value)};
  const storage = value => ({getItem:()=>{if(blockedStorage)throw Error('blocked');return value;}});
  const window = {location};
  vm.runInNewContext(source, {window, sessionStorage:storage(owner?'1':null), localStorage:storage(auth?'opaque-session':null), URL, URLSearchParams});
  return redirects;
}
test('anonymous public home has one canonical marketing destination',()=>{
  for(const path of ['/', '/index.html', '/#home', '/#'])assert.deepEqual(visit(path),['https://www.jovamedia.com/jovabook']);
  assert.deepEqual(visit('/#plans'),['https://www.jovamedia.com/jovabook#plans']);
  assert.deepEqual(visit('/?portal=owner#home'),['https://www.jovamedia.com/jovabook']);
  assert.deepEqual(visit('/?utm_source=instagram&utm_campaign=launch'),['https://www.jovamedia.com/jovabook?utm_source=instagram&utm_campaign=launch']);
});
test('owner, customer, tenant and recovery links never redirect',()=>{
  for(const path of ['/#login','/?plan=essential&cadence=annual#signup','/#dashboard','/?salon=studio#book/service','/?demo=jova-demo#home','/?salon=studio#website','/?portal=customer#customer/login','/?portal=customer#home','/?portal=owner&portal=customer#home','/#access_token=opaque&type=recovery','/?code=opaque','/?unknown=value'])assert.deepEqual(visit(path),[],path);
  for(const options of [{owner:true},{auth:true},{blockedStorage:true},{hostname:'localhost'}])assert.deepEqual(visit('/',options),[]);
  assert.deepEqual(visit('/api/jovabook/integrations/status'),[]);
});
