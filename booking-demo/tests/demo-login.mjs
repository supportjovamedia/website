import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';

const source = await readFile(new URL('../accounts.js', import.meta.url), 'utf8');
const credentials = {salonId:'drink', email:'demo@jovamedia.com', password:'Salon2026', owner:'Demo Owner'};

function directory(remote = false) {
  const state = {salons:[{id:'drink', bookings:[{id:'keep-this-appointment'}]}], accounts:[], resets:[]};
  const storage = new Map(), requests = [];
  const window = remote ? {JOVA_SUPABASE:{url:'https://accounts.example.test', key:'test-anon'}} : {};
  vm.runInNewContext(source, {
    window, crypto:webcrypto, Uint8Array, Date, Math, AbortController,
    localStorage:{getItem:key=>storage.get(key)??null, setItem:(key,value)=>storage.set(key,value), removeItem:key=>storage.delete(key)},
    setTimeout:callback=>{queueMicrotask(callback); return 1;}, clearTimeout:()=>{},
    fetch:async(url, options)=>{requests.push({url, options});return {ok:false,status:400,json:async()=>({})};}
  });
  return {state, requests, api:window.JovaAccounts.create(()=>state, ()=>{})};
}

test('published demo credentials work with the live adapter and do not call an API', async()=>{
  const {state, api, requests} = directory(true);
  api.seed(credentials);
  assert.equal((await api.login(credentials.email, credentials.password)).ok, true);
  assert.equal((await api.login(credentials.email, 'Wrong2026')).ok, false);
  assert.equal(requests.length, 0);
  assert.equal(state.accounts.length, 1);
});

test('an older built-in demo password is repaired without replacing the diary or account', async()=>{
  const {state, api, requests} = directory(true);
  api.seed({...credentials, password:'OldDemo2025'});
  const id = state.accounts[0].id, diary = JSON.stringify(state.salons);
  api.seed(credentials);
  assert.equal((await api.login(credentials.email, credentials.password)).ok, true);
  assert.equal((await api.login(credentials.email, 'OldDemo2025')).ok, false);
  assert.equal(state.accounts[0].id, id);
  assert.equal(state.accounts.length, 1);
  assert.equal(JSON.stringify(state.salons), diary);
  assert.equal(requests.length, 0);
});

test('seeding leaves a registered account unchanged', ()=>{
  const {state, api} = directory();
  state.accounts.push({id:'registered',salonId:'drink',deviceId:'real-device',email:'owner@example.test',norm:'owner@example.test',salt:'keep',hash:'keep'});
  const account = JSON.stringify(state.accounts[0]);
  api.seed(credentials);
  assert.equal(JSON.stringify(state.accounts[0]), account);
  assert.equal(state.accounts.length, 1);
});

test('real-account credentials still go through the live authentication endpoint', async()=>{
  const {api, requests} = directory(true);
  api.seed(credentials);
  assert.equal((await api.login('owner@example.test', 'Salon2026')).ok, false);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/auth\/v1\/token\?grant_type=password$/);
});
