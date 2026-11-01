// JovaBook account rules: address availability, duplicate emails, passwords,
// password reset and free-trial abuse checks.
//
// This preview keeps accounts in the browser (inside the demo state), but every
// check is async and goes through one object, so the real product swaps this
// file for Supabase calls (Auth for email + password, RPCs for the checks)
// without touching the screens. Passwords are only hashed here with a simple
// salted hash so the preview never stores them in plain text. Supabase Auth
// replaces that entirely.
(() => {
  'use strict';

  const RESERVED = ['www','app','admin','support','salon','api','bookings','book','mail','help','billing','status','blog','login','signup','dashboard','jova','jovamedia','jovabook','staging','test','demo'];
  const ADDRESS_RULE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PASSWORD_RULES = [
    { key: 'length', label: 'At least 8 characters', test: p => p.length >= 8 },
    { key: 'capital', label: 'One capital letter', test: p => /[A-Z]/.test(p) },
    { key: 'number', label: 'One number', test: p => /[0-9]/.test(p) }
  ];
  const TRIAL_MS = 3 * 86400000;
  const RESET_MS = 30 * 60000;
  const MAX_ATTEMPTS = 5, LOCK_MS = 60000;

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const latency = () => wait(350 + Math.random() * 350);   // stands in for a network call

  // Two addresses that reach the same inbox count as the same email:
  // Gmail ignores dots and +tags, other providers ignore +tags.
  function normEmail(raw) {
    const e = String(raw || '').trim().toLowerCase();
    const at = e.lastIndexOf('@');
    if (at < 1) return e;
    let local = e.slice(0, at), domain = e.slice(at + 1);
    local = local.split('+')[0];
    if (domain === 'googlemail.com') domain = 'gmail.com';
    if (domain === 'gmail.com') local = local.replace(/\./g, '');
    return local + '@' + domain;
  }
  const digits = v => String(v || '').replace(/\D/g, '').replace(/^44/, '0');
  const flat = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const passwordIssues = pw => PASSWORD_RULES.filter(r => !r.test(String(pw || ''))).map(r => r.key);

  function cyrb53(str, seed) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  function hash(pw, salt) {
    let v = salt + ':' + pw;
    for (let i = 0; i < 400; i++) v = cyrb53(v, i).toString(36) + salt;
    return v;
  }
  const rand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 36).toString(36)).join('');

  function deviceId() {
    try {
      let id = localStorage.getItem('jovabook-device');
      if (!id) { id = 'dev_' + rand(16); localStorage.setItem('jovabook-device', id); }
      return id;
    } catch (e) { return window.__device || (window.__device = 'dev_' + rand(16)); }
  }

  function create(getState, save) {
    const st = () => { const s = getState(); s.accounts = s.accounts || []; s.resets = s.resets || []; return s; };
    const attempts = {};
    const accountFor = salonId => st().accounts.find(a => a.salonId === salonId);
    const salonOf = a => st().salons.find(s => s.id === a.salonId);

    function addressIssue(slug) {
      const s = String(slug || '').trim().toLowerCase();
      if (s.length < 3 || s.length > 30 || !ADDRESS_RULE.test(s)) return 'format';
      if (RESERVED.includes(s)) return 'reserved';
      return null;
    }

    return {
      PASSWORD_RULES, RESERVED, TRIAL_MS, normEmail, passwordIssues, deviceId, accountFor,

      // "Is yourname.jovamedia.com free?"
      async slugStatus(slug) {
        await latency();
        const s = String(slug || '').trim().toLowerCase();
        const bad = addressIssue(s);
        if (bad) return { ok: false, reason: bad };
        if (st().salons.some(x => x.slug === s)) return { ok: false, reason: 'taken' };
        return { ok: true };
      },

      // "Does this email already have an account?" (same inbox counts, e.g. j.smith+1@gmail.com)
      async emailStatus(email) {
        await latency();
        if (!EMAIL_RULE.test(String(email || '').trim())) return { ok: false, reason: 'format' };
        const n = normEmail(email);
        if (st().accounts.some(a => a.norm === n)) return { ok: false, reason: 'taken' };
        return { ok: true };
      },

      // Authoritative create. Re-checks everything the screen already checked.
      async register({ salonId, name, slug, owner, email, password }) {
        await latency();
        const state = st();
        if (!String(name || '').trim()) return { ok: false, field: 'name', message: 'Enter your salon name.' };
        const bad = addressIssue(slug);
        if (bad === 'format') return { ok: false, field: 'slug', message: 'Use 3 to 30 letters, numbers or hyphens.' };
        if (bad === 'reserved') return { ok: false, field: 'slug', message: 'That address is reserved. Choose another.' };
        if (state.salons.some(x => x.slug === String(slug).trim().toLowerCase())) return { ok: false, field: 'slug', message: 'That address is taken. Choose another.' };
        if (!String(owner || '').trim()) return { ok: false, field: 'owner', message: 'Enter your name.' };
        if (!EMAIL_RULE.test(String(email || '').trim())) return { ok: false, field: 'email', message: 'Enter a valid email address.' };
        const norm = normEmail(email);
        if (state.accounts.some(a => a.norm === norm)) return { ok: false, field: 'email', message: 'An account with this email already exists. Log in instead.' };
        if (passwordIssues(password).length) return { ok: false, field: 'password', message: 'Your password needs 8 or more characters, a capital letter and a number.' };

        const dev = deviceId(), flags = [];
        if (state.accounts.filter(a => a.deviceId === dev).length >= 2) flags.push('many_accounts_one_device');
        const salt = rand(10);
        const account = { id: 'acc_' + rand(8), email: String(email).trim(), norm, salt, hash: hash(password, salt), salonId, owner: String(owner).trim(), deviceId: dev, createdAt: new Date().toISOString(), trialUsed: false, flags };
        state.accounts.push(account); save();
        return { ok: true, account };
      },

      // Used for the built-in demo account.
      seed({ salonId, email, password, owner }) {
        const state = st();
        const existing = state.accounts.find(a => a.salonId === salonId);
        if (existing) {
          // Only the built-in fictional account has fixed, published credentials.
          // Refresh old demo credentials without touching registered accounts or diary data.
          if (existing.deviceId === 'seed') {
            existing.email = email;
            existing.norm = normEmail(email);
            if (!existing.salt || existing.hash !== hash(password, existing.salt)) {
              existing.salt = rand(10);
              existing.hash = hash(password, existing.salt);
            }
          }
          return;
        }
        const salt = rand(10);
        state.accounts.push({ id: 'acc_' + rand(8), email, norm: normEmail(email), salt, hash: hash(password, salt), salonId, owner, deviceId: 'seed', createdAt: new Date().toISOString(), trialUsed: true, flags: [] });
      },

      async login(email, password) {
        await latency();
        const n = normEmail(email), now = Date.now(), t = attempts[n] || { n: 0, until: 0 };
        if (t.until > now) return { ok: false, locked: true, message: 'Too many attempts. Wait a minute, then try again.' };
        const a = st().accounts.find(x => x.norm === n);
        if (a && a.hash === hash(String(password || ''), a.salt)) { delete attempts[n]; return { ok: true, account: a }; }
        t.n += 1; if (t.n >= MAX_ATTEMPTS) { t.until = now + LOCK_MS; t.n = 0; }
        attempts[n] = t;
        return { ok: false, message: 'That email and password do not match.' };   // same message either way
      },

      async requestReset(email) {
        await latency();
        const state = st(), a = state.accounts.find(x => x.norm === normEmail(email));
        if (!a) return { ok: true, sent: false };
        state.resets = state.resets.filter(r => r.expires > Date.now() && r.accountId !== a.id);
        const token = rand(24);
        state.resets.push({ token, accountId: a.id, expires: Date.now() + RESET_MS });
        save();
        return { ok: true, sent: true, token, email: a.email };
      },

      async checkResetToken(token) {
        await latency();
        const r = st().resets.find(x => x.token === token && x.expires > Date.now());
        return { ok: !!r };
      },

      async resetPassword(token, password) {
        await latency();
        const state = st(), r = state.resets.find(x => x.token === token && x.expires > Date.now());
        if (!r) return { ok: false, message: 'This link has expired. Request a new one.' };
        if (passwordIssues(password).length) return { ok: false, message: 'Your password needs 8 or more characters, a capital letter and a number.' };
        const a = state.accounts.find(x => x.id === r.accountId);
        if (!a) return { ok: false, message: 'This link has expired. Request a new one.' };
        a.salt = rand(10); a.hash = hash(password, a.salt);
        state.resets = state.resets.filter(x => x.token !== token);
        save();
        return { ok: true };
      },

      // One free trial per business. Compared on the same device, phone number and
      // business address. Production adds the Stripe card fingerprint, the strongest
      // signal, plus server-side IP and email-domain checks.
      trialEligibility(salonId) {
        const state = st(), me = accountFor(salonId), mine = state.salons.find(s => s.id === salonId);
        if (!me || !mine) return { eligible: true, reasons: [] };
        const reasons = [];
        state.accounts.filter(o => o.id !== me.id && o.trialUsed).forEach(o => {
          const theirs = salonOf(o);
          if (o.deviceId && o.deviceId === me.deviceId) reasons.push('same_device');
          if (theirs && digits(theirs.phone) && digits(theirs.phone) === digits(mine.phone)) reasons.push('same_phone');
          if (theirs && flat(theirs.address) && flat(theirs.address) === flat(mine.address)) reasons.push('same_address');
        });
        const unique = [...new Set(reasons)];
        if (unique.length) { unique.forEach(r => { const f = 'repeat_trial:' + r; if (!me.flags.includes(f)) me.flags.push(f); }); save(); }
        return { eligible: !unique.length, reasons: unique };
      },

      markTrialUsed(salonId) { const a = accountFor(salonId); if (a) { a.trialUsed = true; save(); } }
    };
  }


  // ---- Live version: same calls, answered by the "jovabook" Supabase project ----
  // Accounts, booking addresses and trial checks are real and shared between devices.
  // The salon's diary lives in database tables, each row carrying its salon_id.
  function createRemote(getState, save, local) {
    const cfg = window.JOVA_SUPABASE, AUTH = 'jovabook-auth';
    const DEMO = normEmail('demo@jovamedia.com');
    const load = () => { try { return JSON.parse(localStorage.getItem(AUTH) || 'null'); } catch (e) { return null; } };
    let generation=0,refreshFlight=null,refreshFailure=null,verifiedSalon=null,verifiedAccess=null;
    const SIGNUP_DRAFT='jovabook-owner-signup-draft-v1';
    const EXISTING='jovabook-existing-business-v1';let pendingBusinessOwner=null;
    try{pendingBusinessOwner=JSON.parse(sessionStorage.getItem(EXISTING)||'null');}catch{}
    const clearExisting=()=>{pendingBusinessOwner=null;try{sessionStorage.removeItem(EXISTING);}catch{}};
    const existingBusinessContext=()=>{if(!pendingBusinessOwner?.id||pendingBusinessOwner.id!==load()?.user?.id)return null;let draft={};try{const saved=JSON.parse(localStorage.getItem(SIGNUP_DRAFT)||'null');if(saved?.email?.toLowerCase()===pendingBusinessOwner.email?.toLowerCase())draft={name:typeof saved.name==='string'?saved.name.slice(0,60):'',slug:typeof saved.slug==='string'?saved.slug.slice(0,30):''};}catch{}return {owner:pendingBusinessOwner.owner,email:pendingBusinessOwner.email,...draft};};
    const rawSession=()=>{try{return localStorage.getItem(AUTH);}catch{return null;}};
    const stamp=()=>({raw:rawSession(),generation});
    const current=expected=>expected.generation===generation&&expected.raw===rawSession();
    const keep = s => {if(!s||load()?.user?.id!==s.user?.id){verifiedSalon=null;verifiedAccess=null;clearExisting();}generation++;refreshFlight=null;refreshFailure=null;try { s ? localStorage.setItem(AUTH, JSON.stringify(s)) : localStorage.removeItem(AUTH); } catch (e) {} };
    const intent=()=>{clearExisting();generation++;refreshFlight=null;return stamp();};
    const stale=()=>({ok:false,stale:true,status:0,message:'Your session changed. Open this page again.'});
    const authFailure=()=>refreshFailure&&current(refreshFailure.expected)?refreshFailure.result:load()?stale():{ok:false,auth:true,status:401,message:'Your session has ended. Log in again.'};
    const writeScope=(salonId)=>!!salonId&&!!load()?.user?.id&&!!verifiedAccess?.data&&verifiedAccess.ownerId===load().user.id&&['active','setup'].includes(verifiedAccess.data.access)&&!!verifiedSalon?.ownerId&&verifiedSalon.id===salonId&&verifiedSalon.ownerId===load()?.user?.id;
    const scopeFailure=()=>!load()?.user?.id?{ok:false,auth:true,status:401,message:'Your session has ended. Log in again.'}:({...stale(),invalidTenant:true,message:'Your business changed. Refresh before saving.'});
    const websiteBucket='jovabook-website-images',websiteImageLimit=5*1024*1024;
    const websiteUuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
    const websiteId=value=>typeof value==='string'&&new RegExp('^'+websiteUuid+'$').test(value);
    function safeWebsiteImage(value,salonId) {
      if(!websiteId(salonId)||typeof value!=='string'||value.length>600||/[\\?#\s]/.test(value))return '';
      try {
        const configured=new URL(cfg.url),url=new URL(value),raw=value.match(/^https:\/\/[^/]+(\/[^?#]*)$/);
        if(configured.protocol!=='https:'||url.protocol!=='https:'||url.origin!==configured.origin||url.username||url.password||!raw)return '';
        const path=new RegExp('^/storage/v1/object/public/'+websiteBucket+'/'+salonId+'/'+websiteUuid+'\\.(jpg|png|webp)$');
        if(!path.test(raw[1])||!path.test(url.pathname)||decodeURIComponent(url.pathname)!==url.pathname)return '';
        return url.href;
      }catch{return '';}
    }
    async function uploadWebsiteImage(file,salonId) {
      if(!websiteId(salonId)||!writeScope(salonId))return scopeFailure();
      const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'},type=file?.type;
      if(!Object.hasOwn(types,type)||typeof file?.arrayBuffer!=='function')return {ok:false,message:'Choose a JPEG, PNG or WebP image.'};
      if(!Number.isInteger(file.size)||file.size<=0||file.size>websiteImageLimit)return {ok:false,message:'Choose an image no larger than 5 MB.'};
      const reading=stamp();let bytes;
      try{bytes=new Uint8Array(await file.arrayBuffer());}catch{return !current(reading)?stale():{ok:false,message:'This image could not be read. Choose it again.'};}
      if(!current(reading))return stale();
      if(!writeScope(salonId))return scopeFailure();
      const starts=signature=>signature.every((value,index)=>bytes[index]===value);
      const raster=type==='image/jpeg'?starts([255,216,255]):type==='image/png'?starts([137,80,78,71,13,10,26,10]):starts([82,73,70,70])&&[87,69,66,80].every((value,index)=>bytes[index+8]===value);
      if(bytes.byteLength!==file.size||!raster)return {ok:false,message:'This file is not a supported image. Choose a JPEG, PNG or WebP image.'};
      const owner=load()?.user?.id,t=await token();if(!t)return authFailure();
      if(!writeScope(salonId)||load()?.user?.id!==owner||load()?.access_token!==t)return scopeFailure();
      const expected=stamp(),path=salonId+'/'+crypto.randomUUID()+'.'+types[type];
      const url=safeWebsiteImage(cfg.url.replace(/\/$/,'')+'/storage/v1/object/public/'+websiteBucket+'/'+path,salonId);
      if(!url)return {ok:false,message:'Image uploads are not available for this account yet.'};
      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);
      try {
        const r=await fetch(cfg.url.replace(/\/$/,'')+'/storage/v1/object/'+websiteBucket+'/'+path,{method:'POST',signal:ctl.signal,body:bytes,headers:{apikey:cfg.key,Authorization:'Bearer '+t,'Content-Type':type,'Cache-Control':'max-age=3600','x-upsert':'false'}});
        let data=null;try{data=await r.json();}catch{}
        if(!current(expected))return stale();
        if(!writeScope(salonId)||load()?.user?.id!==owner)return scopeFailure();
        if(!r.ok){const status=Number(data?.statusCode)||r.status;return {ok:false,status,auth:status===401,unavailable:status===404||/bucket.*not found/i.test(String(data?.message||data?.error||'')),message:status===413?'Choose an image no larger than 5 MB.':status===401?'Your session has ended. Log in again.':status===404||/bucket.*not found/i.test(String(data?.message||data?.error||''))?'Image uploads are not available for this account yet.':'The image could not be uploaded. Please try again.'};}
        return {ok:true,url,path,bucket:websiteBucket};
      }catch{return !current(expected)?stale():{ok:false,network:true,status:0,message:'The image could not be uploaded. Check your connection and try again.'};}
      finally{clearTimeout(timer);}
    }
    async function call(path, { method = 'POST', body, token, headers, owner=false } = {}) {
      const expected=owner?stamp():null;
      if(owner&&(!token||load()?.access_token!==token))return stale();
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
      try {
        const r = await fetch(cfg.url + path, { method, signal: ctl.signal, body: body === undefined ? undefined : JSON.stringify(body),
          headers: Object.assign({ apikey: cfg.key, 'Content-Type': 'application/json' }, (token || /^eyJ/.test(cfg.key)) ? { Authorization: 'Bearer ' + (token || cfg.key) } : {}, headers || {}) });
        let data = null; try { data = await r.json(); } catch (e) {}
        if(expected&&!current(expected))return stale();
        return { ok: r.ok, status: r.status, data };
      } catch (e) { return expected&&!current(expected)?stale():{ ok: false, status: 0, data: null, network: true }; }
      finally { clearTimeout(timer); }
    }
    const rpc = (fn, args, token) => call('/rest/v1/rpc/' + fn, { body: args || {}, token,owner:!!token });
    function smsOwnerData(d){
      const flags=['eligible','provider_configured','global_enabled','business_enabled','budget_configured','enabled'];
      if(!d||d.provider!=='The SMS Works'||!['essential','standard','premium'].includes(d.plan)||flags.some(key=>typeof d[key]!=='boolean')||d.consent_required!==true||d.reminder_hours!==24||(d.remaining_segments!==null&&(!Number.isSafeInteger(d.remaining_segments)||d.remaining_segments<0)))return null;
      const counts=['scheduled','sent','delivered','failed','unknown','cancelled','suppressed'];if(d.delivery_counts&&(typeof d.delivery_counts!=='object'||counts.some(key=>!Number.isSafeInteger(d.delivery_counts[key])||d.delivery_counts[key]<0)))return null;const result=Object.fromEntries(['provider','plan',...flags,'consent_required','reminder_hours','remaining_segments'].map(key=>[key,d[key]]));if(d.delivery_counts){result.delivery_counts=Object.fromEntries(counts.map(key=>[key,d.delivery_counts[key]]));result.needs_review=!!d.needs_review||result.delivery_counts.failed>0||result.delivery_counts.unknown>0;}return result;
    }
    const NET = 'We couldn’t reach the server. Check your connection and try again.';
    async function token() {
      const expected=stamp(),s = load(); if (!s) return null;
      if (s.expires_at * 1000 > Date.now() + 30000) return s.access_token;
      if(refreshFlight&&refreshFlight.raw===expected.raw&&refreshFlight.generation===expected.generation)return refreshFlight.promise;
      const promise=(async()=>{const r = await call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } });
        if(!current(expected))return null;
        if (r.ok && r.data && r.data.access_token) { keep(r.data); return r.data.access_token; }
        if(r.network||r.status===429||r.status>=500){refreshFailure={expected,result:{ok:false,network:!!r.network,status:r.status,message:r.network?NET:'Your session could not be refreshed. Try again shortly.'}};return null;}
        keep(null); return null;})();
      refreshFlight={...expected,promise};try{return await promise;}finally{if(refreshFlight?.promise===promise)refreshFlight=null;}
    }
    async function signInPassword(email, password,expected=intent()) {
      const r = await call('/auth/v1/token?grant_type=password', { body: { email: String(email).trim(), password } });
      if(!current(expected))return stale();
      if (r.ok && r.data && r.data.access_token) keep(r.data);
      return {...r,authStamp:stamp()};
    }
    async function mySalon() {
      const t = await token(); if (!t) return null;
      const r = await call('/rest/v1/salons?select=*&limit=1', { method: 'GET', token: t,owner:true });
      const row=r.ok&&Array.isArray(r.data)&&r.data.length===1?r.data[0]:null;
      if(row&&row.owner_id===load()?.user?.id){verifiedSalon={id:row.id,ownerId:row.owner_id};return row;}
      return null;
    }
    async function billingCall(action,body={}) {
      const t=await token();if(!t)return authFailure();const expected=stamp(),ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000);
      try{const response=await fetch('/api/jovabook/billing/'+action,{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(body)});let data=null;try{data=await response.json();}catch{}if(!current(expected))return stale();return {ok:response.ok&&data?.ok===true,status:response.status,data,auth:response.status===401,message:data?.message||'We could not verify your subscription. Try again.'};}
      catch{return current(expected)?{ok:false,network:true,message:NET}:stale();}finally{clearTimeout(timer);}
    }
    async function integrationCall(action,body={}) {
      if(!['integrations/status','integrations/connect','integrations/configure','integrations/oauth/start','integrations/oauth/complete','integrations/disconnect','recovery/preview','recovery/send'].includes(action))return {ok:false,message:'This connection action is unavailable.'};
      const sid=body.salon_id;if(!writeScope(sid))return scopeFailure();const t=await token();if(!t)return authFailure();if(!writeScope(sid))return scopeFailure();const expected=stamp(),ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),20000);
      try{const response=await fetch('/api/jovabook/'+action,{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(body)});let data=null;try{data=await response.json();}catch{}if(!current(expected)||!writeScope(sid))return stale();if(data?.salon_id&&data.salon_id!==sid)return scopeFailure();return {ok:response.ok&&data?.ok===true,status:response.status,data,message:typeof data?.message==='string'?data.message:'We could not verify this connection request. Try again.'};}
      catch{return current(expected)&&writeScope(sid)?{ok:false,network:true,message:NET}:stale();}finally{clearTimeout(timer);}
    }
    async function ownerAccess() {
      const ownerId=load()?.user?.id,result=await billingCall('status');if(result.stale)return result;
      const data=result.data,business=data?.business;
      if(result.ok&&data?.no_business===true&&data.access==='no_business'&&business===null){verifiedAccess=null;verifiedSalon=null;if(!ownerId||ownerId!==load()?.user?.id)return stale();return {ok:false,noBusiness:true,data,message:'No business is linked to this account. Log in to create one.'};}
      if(!result.ok||!['active','billing_only','setup','deleting'].includes(data?.access)||!websiteId(business?.id)||!['essential','standard','premium'].includes(business?.plan)||typeof business?.name!=='string'||typeof business?.slug!=='string'||!data.lifecycle||typeof data.billing?.connected!=='boolean'||typeof data.billing?.canCheckout!=='boolean'){
        verifiedAccess=null;verifiedSalon=null;return {...result,ok:false,message:result.message||'We could not verify your subscription. Try again.'};
      }
      if(ownerId!==load()?.user?.id)return stale();
      clearExisting();
      verifiedAccess={ownerId,data};verifiedSalon=['active','setup'].includes(data.access)?{id:business.id,ownerId}:null;
      return {ok:true,data};
    }
    async function verifiedBusinessIdentity(){const t=await token();if(!t)return authFailure();const result=await call('/auth/v1/user',{method:'GET',token:t,owner:true});if(result.stale)return result;const user=result.data;if(!result.ok||!user?.id||user.id!==load()?.user?.id||typeof user.email!=='string'||!Number.isFinite(Date.parse(user.email_confirmed_at||'')))return {ok:false,message:'Verify your email, then log in before creating a business.'};const metadata=user.user_metadata||{},name=metadata.owner_name||metadata.full_name||[metadata.first_name,metadata.last_name].filter(v=>typeof v==='string').join(' ');return {ok:true,profile:{id:user.id,email:user.email,owner:String(name||'Owner').trim().slice(0,80)||'Owner'}};}
    const isDemo = email => normEmail(email) === DEMO;
    const RECOVERY='jovabook-recovery-v1';
    const recoveryRaw=()=>{try{return sessionStorage.getItem(RECOVERY);}catch{return null;}};
    const recovery=()=>{try{return JSON.parse(recoveryRaw()||'null');}catch{return null;}};
    const clearRecovery=expected=>{if(expected!==undefined&&expected!==recoveryRaw())return;try{sessionStorage.removeItem(RECOVERY);}catch{}};
    const expiredRecovery=()=>({ok:false,reason:'expired',message:'This link has expired. Request a new one.'});
    function recoveryContext(tok='') {const saved=recovery();if(!saved||saved.kind!=='recovery'||(tok&&tok!==saved.access_token)||typeof saved.access_token!=='string'||!Number.isFinite(saved.expires_at)||saved.expires_at*1000<=Date.now())return null;return {session:saved,raw:recoveryRaw()};}
    async function verifyRecovery(tok='') {
      const expected=recoveryContext(tok);if(!expected){if(!tok||recovery()?.access_token===tok)clearRecovery();return expiredRecovery();}
      const r=await call('/auth/v1/user',{method:'GET',token:expected.session.access_token});
      if(recoveryRaw()!==expected.raw)return stale();
      if(r.network)return {ok:false,reason:'network',network:true,retryable:true,message:NET};
      if(r.status===429||r.status>=500)return {ok:false,reason:'unavailable',retryable:true,message:'Password reset is temporarily unavailable. Try again shortly.'};
      if(!r.ok||!r.data?.id){clearRecovery(expected.raw);return expiredRecovery();}
      return {ok:true,mode:'live',context:expected};
    }

    return Object.assign({}, local, {
      remote: true,
      safeWebsiteImage,
      uploadWebsiteImage,

      async slugStatus(slug) {
        const s = String(slug || '').trim().toLowerCase();
        const r = await rpc('slug_status', { p_slug: s });
        if (!r.ok) return { ok: false, reason: 'network' };
        return r.data === 'ok' ? { ok: true } : { ok: false, reason: r.data };
      },
      async emailStatus(email) {
        if (!EMAIL_RULE.test(String(email || '').trim())) return { ok: false, reason: 'format' };
        const r = await rpc('email_available', { p_email: String(email).trim() });
        if (!r.ok) return { ok: false, reason: 'network' };
        return r.data === true ? { ok: true } : { ok: false, reason: 'taken' };
      },
      async register({name,slug,owner,email,password}) {
        const expected=intent(),n=String(name||'').trim(),s=String(slug||'').trim().toLowerCase(),o=String(owner||'').trim(),e=String(email||'').trim();
        if(!n||n.length>60)return {ok:false,field:'name',message:'Enter a business name up to 60 characters.'};
        if(s.length<3||s.length>30||!ADDRESS_RULE.test(s)||RESERVED.includes(s))return {ok:false,field:'slug',message:'Choose an address with 3 to 30 letters, numbers or hyphens.'};
        if(!o||o.length>80)return {ok:false,field:'owner',message:'Enter your name, up to 80 characters.'};
        if(!EMAIL_RULE.test(e)||e.length>254)return {ok:false,field:'email',message:'Enter a valid email address.'};
        if(passwordIssues(password).length||String(password||'').length>72)return {ok:false,field:'password',message:'Use 8 to 72 characters, a capital letter and a number.'};
        const origin=String(location.origin||''),local=/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/.test(origin),redirect=(local?origin:'https://book.jovamedia.com')+'/?portal=owner#login';
        const r=await call('/auth/v1/signup?redirect_to='+encodeURIComponent(redirect),{body:{email:e,password,data:{owner_name:o}}});if(!current(expected))return stale();
        if(r.network)return {ok:false,field:'',message:NET};
        if(!r.ok||!r.data){const duplicate=/already|registered|exists/i.test(String(r.data?.msg||r.data?.message||''));return {ok:false,field:duplicate?'email':'',message:duplicate?'This email may already have an account. Log in with that account to create your business.':r.status===429?'Too many attempts. Wait a little before trying again.':'We could not request email verification. Please try again.'};}
        // Signup responses never establish an owner session or create a business.
        try{localStorage.setItem(SIGNUP_DRAFT,JSON.stringify({name:n,slug:s,owner:o,email:e}));}catch{}
        return {ok:true,verificationRequired:true};
      },
      async login(email, password) {
        if (isDemo(email)) {const expected=intent(),result=await local.login(email,password);if(!current(expected))return stale();if(result.ok)keep(null);return result;}
        const r = await signInPassword(email, password);
        if(r.stale)return r;
        if (r.network) return { ok: false, message: NET };
        if (r.status === 429) return { ok: false, locked: true, message: 'Too many attempts. Wait a minute, then try again.' };
        if (!r.ok) return {ok:false,message:/email_not_confirmed|email.*not confirmed/i.test(String(r.data?.error_code||r.data?.code||r.data?.msg||r.data?.message||''))?'Verify your email from the link you received, then log in.':'That email and password do not match.'};
        const access = await ownerAccess();
        if(!current(r.authStamp))return stale();
        if(access.noBusiness){const identity=await verifiedBusinessIdentity();if(!identity.ok)return identity;if(!current(r.authStamp))return stale();pendingBusinessOwner=identity.profile;try{sessionStorage.setItem(EXISTING,JSON.stringify(pendingBusinessOwner));}catch{}return {ok:true,needsBusiness:true,profile:existingBusinessContext()};}
        if (!access.ok)return access;
        return {ok:true,account:{salonId:access.data.business.id},access:access.data,salon:{id:access.data.business.id}};
      },
      async requestReset(email) {
        if (isDemo(email)) return local.requestReset(email);
        const r=await call('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + '/'), { body: { email: String(email).trim() } });
        if(r.network)return {ok:false,network:true,message:NET};
        if(r.status===429)return {ok:false,locked:true,message:'Too many reset requests. Wait a minute, then try again.'};
        if(!r.ok)return {ok:false,message:'The password reset email could not be requested. Try again shortly.'};
        return { ok: true, sent: true };   // normal success stays the same whether or not the account exists
      },
      consumeOwnerConfirmationCallback(hash){if(new URLSearchParams(location.search||'').get('portal')!=='owner')return {handled:false};const params=new URLSearchParams(String(hash||'').replace(/^#/,''));if(params.get('type')!=='signup'&&!params.has('error')&&!params.has('error_code'))return {handled:false};return {handled:true,notice:params.has('error')||params.has('error_code')?'Your verification link could not be confirmed. Log in to continue, or request a new verification link.':'Your verification link has been opened. Log in to continue and confirm your business details.'};},
      consumeRecoveryCallback(hash) {
        if(new URLSearchParams(location.search||'').get('portal')==='customer')return {handled:false};
        const params=new URLSearchParams(String(hash||'').replace(/^#/,''));
        if(params.has('error')){clearRecovery();return {handled:true,...expiredRecovery()};}
        if(params.get('type')!=='recovery')return {handled:false};
        const access=params.get('access_token')||'';
        try{if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(access))throw Error();const payload=JSON.parse(atob(access.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));const exp=Number(payload.exp),hint=params.has('expires_at')?Number(params.get('expires_at')):params.has('expires_in')?Date.now()/1000+Number(params.get('expires_in')):exp;const expires_at=Math.min(exp,hint);if(!Number.isFinite(expires_at)||expires_at*1000<=Date.now())throw Error();sessionStorage.setItem(RECOVERY,JSON.stringify({kind:'recovery',access_token:access,expires_at}));return {handled:true,ok:true};}catch{clearRecovery();return {handled:true,...expiredRecovery()};}
      },
      async checkResetToken(tok='') {
        if(tok&&(getState().resets||[]).some(x=>x.token===tok))return local.checkResetToken(tok);
        const result=await verifyRecovery(tok);if(result.context)delete result.context;return result;
      },
      async resetPassword(tok='', password) {
        if (passwordIssues(password).length) return { ok: false, message: 'Your password needs 8 or more characters, a capital letter and a number.' };
        if ((getState().resets || []).some(x => x.token === tok)) return local.resetPassword(tok, password);
        const verified=await verifyRecovery(tok);if(!verified.ok)return verified;
        const expected=verified.context;
        const r = await call('/auth/v1/user', { method: 'PUT', body: { password }, token: expected.session.access_token });
        if(recoveryRaw()!==expected.raw)return stale();
        if (r.network) return { ok: false, message: NET };
        if(r.status===401||r.status===403){clearRecovery(expected.raw);return expiredRecovery();}
        if(r.status===429||r.status>=500)return {ok:false,reason:'unavailable',retryable:true,message:'Password reset is temporarily unavailable. Try again shortly.'};
        if (!r.ok) return { ok: false, message: /same|different/i.test((r.data && (r.data.msg || r.data.message)) || '') ? 'Choose a password you haven’t used before.' : 'Your password could not be updated. Try again, or request a new reset link.' };
        clearRecovery(expected.raw);
        return { ok: true };
      },
      async syncSetup(salon) {
        const t = await token(); if (!t) return { ok: false };
        const r = await rpc('save_setup', { p_address: salon.address, p_phone: salon.phone, p_settings: { hours: salon.hours, color: salon.color } }, t);
        return { ok: r.ok };
      },
      async trialCheck() {
        const t = await token(); if (!t) return { ok: false };
        const r = await rpc('trial_check', {}, t);
        return r.ok && r.data ? { ok: true, eligible: !!r.data.eligible, reasons: r.data.reasons || [] } : { ok: false };
      },
      async startTrial() {
        const t = await token(); if (!t) return { ok: false, message: 'Your session has ended. Log in again.' };
        const r = await rpc('start_trial', {}, t);
        if (r.network) return { ok: false, message: NET };
        if (!r.ok || !r.data) return { ok: false, message: 'We couldn’t start your trial. Try again.' };
        return { ok: true, eligible: !!r.data.eligible, status: r.data.status, trial_ends_at: r.data.trial_ends_at };
      },

      // ---- diary tables (every row belongs to one salon; the database only returns the signed-in owner's) ----
      async ownerRpc(fn, args = {}) {
        const t = await token();
        if (!t) return authFailure();
        const r = await rpc(fn, args, t);
        return {ok:r.ok, data:r.data, network:r.network,stale:r.stale,auth:r.auth, message:r.message||r.data?.message || (r.network ? NET : 'We could not save that change. Please try again.')};
      },
      async loadActivity(salonId, since) {
        const t = await token();
        if (!t) return authFailure();
        const after = since && Number.isFinite(Date.parse(since)) ? '&updated_at=gte.' + encodeURIComponent(new Date(since).toISOString()) : '';
        const r = await call('/rest/v1/email_log?select=*&salon_id=eq.' + encodeURIComponent(salonId) + after + '&order=updated_at.desc&limit=200', {method:'GET', token:t,owner:true});
        if(r.stale)return r;
        const valid=r.ok&&Array.isArray(r.data)&&r.data.every(row=>row.salon_id===salonId);
        return {ok:valid, rows:valid?r.data:[],...(!valid&&r.ok?{invalidTenant:true}:{})};
      },
      async emailDeliveryInfo() {
        const t = await token();
        if (!t) return authFailure();
        const r = await rpc('email_delivery_info', {}, t), data = r.data;
        if (!r.ok || !data || typeof data.enabled !== 'boolean' || data.provider !== 'Resend' || data.reminder_hours !== 24) return {ok:false, network:r.network};
        return {ok:true, data:{enabled:data.enabled, provider:data.provider, reminder_hours:data.reminder_hours}};
      },
      async smsReminderInfo() {
        const t=await token();if(!t)return authFailure();
        const r=await rpc('sms_reminder_info',{},t),data=smsOwnerData(r.data);
        return r.ok&&data?{ok:true,data}:{ok:false,stale:r.stale,auth:r.auth,network:r.network,status:r.status,message:'We could not load SMS status. Please try again.'};
      },
      async setSmsReminders(enabled,salonId) {
        if(typeof enabled!=='boolean'||!writeScope(salonId))return scopeFailure();
        const t=await token();if(!t)return authFailure();if(!writeScope(salonId))return scopeFailure();
        const r=await rpc('set_sms_reminders',{p_enabled:enabled,p_salon:salonId},t),data=smsOwnerData(r.data);
        if(r.stale||!writeScope(salonId))return scopeFailure();
        return r.ok&&data?{ok:true,data}:{ok:false,stale:r.stale,auth:r.auth,network:r.network,status:r.status,message:'Your SMS setting was not saved. Check availability and try again.'};
      },
      async publicSmsReminderInfo(slug) {
        const r=await rpc('public_sms_reminder_info',{p_slug:slug}),d=r.data;
        return r.ok&&d&&typeof d.available==='boolean'&&d.consent_required===true&&d.reminder_hours===24?{ok:true,data:{available:d.available,consent_required:true,reminder_hours:24}}:{ok:false,data:{available:false}};
      },
      async ownerCapabilities() {
        const t = await token();
        if (!t) return null;
        const r = await rpc('owner_capabilities', {}, t);
        return r.ok && r.data ? r.data : null;
      },
      async loadDiary() {
        const access=await ownerAccess();if(!access.ok)return access;
        const onboarding=access.data.access==='setup'||(access.data.access==='active'&&access.data.business.status==='setup');if(access.data.access!=='active'||onboarding)return {ok:true,access:access.data,billingOnly:!onboarding,setup:onboarding};
        const t = await token(); if (!t) return authFailure();
        const expected=stamp();
        const get = q => call('/rest/v1/' + q + '&limit=5000', { method: 'GET', token: t,owner:true });
        const names = ['categories', 'staff', 'services', 'customers', 'bookings', 'email_log', 'payments'];
        const orders = ['created_at,id', 'created_at,id', 'created_at,id', 'created_at,id', 'date,time', 'sent_at.desc', 'created_at.desc'];
        const salonResult=await get('salons?select=*');
        if(!current(expected)||salonResult.stale)return stale();
        if(!salonResult.ok||!Array.isArray(salonResult.data))return {...salonResult,auth:salonResult.status===401};
        if(salonResult.data.length!==1)return {ok:false,invalidTenant:salonResult.data.length>1,message:'Your business could not be loaded. Log in again.'};
        const selected=salonResult.data[0],owner=load()?.user?.id;
        if(!owner||selected.owner_id!==owner||selected.id!==access.data.business.id)return {ok:false,invalidTenant:true,message:'Your business could not be loaded. Log in again.'};
        const res=[salonResult,...await Promise.all(names.map((n,i)=>get(n+'?select=*&salon_id=eq.'+encodeURIComponent(selected.id)+'&order='+orders[i])))];
        if(!current(expected)||res.some(r=>r.stale))return stale();
        if(res.slice(1).some(r=>r.ok&&Array.isArray(r.data)&&r.data.some(row=>row.salon_id!==selected.id)))return {ok:false,invalidTenant:true,message:'Your business records could not be verified. Refresh and try again.'};
        const emailIndex=names.indexOf('email_log')+1;
        const core=res.filter((r,index)=>index!==emailIndex);
        if (core.some(r => !r.ok || !Array.isArray(r.data))) return { ok: false, network: core.some(r => r.network), auth: core.some(r => r.status === 401) };
        const emailActivityUnavailable=!res[emailIndex].ok || !Array.isArray(res[emailIndex].data);
        const rows = {}; names.forEach((n, i) => { rows[n] = n==='email_log'&&emailActivityUnavailable?[]:res[i + 1].data; });
        const checked=await ownerAccess();if(!checked.ok)return checked;
        if(checked.data.access!=='active')return {ok:true,access:checked.data,billingOnly:checked.data.access!=='setup',setup:checked.data.access==='setup'};
        if(!current(expected)||checked.data.business.id!==selected.id)return stale();
        verifiedSalon={id:selected.id,ownerId:selected.owner_id};
        return { ok: true, salon: res[0].data[0] || null, rows, emailActivityUnavailable,access:checked.data };
      },
      async upsertRows(table, rows) {
        if (table === 'email_log') return {ok:false, status:403, message:'Email delivery records are read-only.'};
        const target=Array.isArray(rows)&&rows.length?rows[0].salon_id:null;
        if(!writeScope(target)||rows.some(row=>row.salon_id!==target))return scopeFailure();
        const t = await token(); if (!t) return authFailure();
        if(!writeScope(target))return scopeFailure();
        const r = await call('/rest/v1/' + table + '?on_conflict=salon_id,id', { token: t,owner:true, body: rows, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
        return { ok: r.ok,stale:r.stale,auth:r.auth, network: r.network, status: r.status, message: r.message||r.data && r.data.message };
      },
      async deleteRows(table, salonId, ids) {
        if (table === 'email_log') return {ok:false, status:403, message:'Email delivery records are read-only.'};
        if(!writeScope(salonId))return scopeFailure();
        const t = await token(); if (!t) return authFailure();
        if(!writeScope(salonId))return scopeFailure();
        const list = ids.map(i => '"' + String(i).replace(/"/g, '') + '"').join(',');
        const r = await call('/rest/v1/' + table + '?salon_id=eq.' + salonId + '&id=in.(' + encodeURIComponent(list) + ')', { method: 'DELETE', token: t,owner:true, headers: { Prefer: 'return=minimal' } });
        return { ok: r.ok,stale:r.stale,auth:r.auth, network: r.network, status: r.status };
      },
      async saveSalon(a,expectedSalonId) {
        if(!writeScope(expectedSalonId))return scopeFailure();
        const t = await token(); if (!t) return authFailure();
        if(!writeScope(expectedSalonId))return scopeFailure();
        const r = await rpc('save_salon', a, t);
        return { ok: r.ok,stale:r.stale,auth:r.auth, network: r.network, status: r.status, message: r.message||r.data && r.data.message };
      },
      async setSubscription(kind) {
        const t = await token(); if (!t) return { ok: false };
        const r = await rpc(kind === 'cancel' ? 'cancel_subscription' : 'resubscribe', {}, t);
        return { ok: r.ok };
      },
      async publicRpc(fn, args) {
        const r = await rpc(fn, args);
        if (r.network) return { ok: false, network: true, message: NET };
        return { ok: r.ok, data: r.data, message: r.ok ? '' : 'Something went wrong. Please try again.' };
      },
      ownerAccess,
      existingBusinessContext,
      async createBusinessForExistingUser({name,slug}){const context=existingBusinessContext();if(!context)return {ok:false,message:'Log in again before creating your business.'};const identity=load()?.user?.id,n=String(name||'').trim(),s=String(slug||'').trim().toLowerCase();if(!n||n.length>60)return {ok:false,field:'name',message:'Enter a business name up to 60 characters.'};if(s.length<3||s.length>30||!ADDRESS_RULE.test(s)||RESERVED.includes(s))return {ok:false,field:'slug',message:'Choose an available address with 3 to 30 letters, numbers or hyphens.'};const access=await ownerAccess();if(identity!==load()?.user?.id)return stale();if(!access.noBusiness)return {ok:false,message:access.ok?'This account already has a business. Log in to open it.':access.message};const verified=await verifiedBusinessIdentity();if(!verified.ok)return verified;if(identity!==load()?.user?.id||verified.profile.id!==identity)return stale();const t=await token();if(!t)return authFailure();const result=await rpc('create_business_for_existing_user',{p_name:n,p_slug:s,p_owner:verified.profile.owner},t);if(result.stale||identity!==load()?.user?.id)return stale();if(!result.ok||result.data?.ok!==true||!websiteId(result.data.salon_id))return {ok:false,field:result.data?.field||'',message:result.data?.message||'We could not create your business. Try again.'};const checked=await ownerAccess();if(identity!==load()?.user?.id)return stale();if(!checked.ok||checked.data.business.id!==result.data.salon_id)return {ok:false,message:'Your business was created. Log in to verify its subscription and continue.'};try{localStorage.removeItem(SIGNUP_DRAFT);}catch{}return {ok:true,account:{salonId:result.data.salon_id},access:checked.data,profile:{owner:verified.profile.owner,email:verified.profile.email}};},
      integrationCall,
      billingCheckout(plan,salonId,requestId,termsVersion,cadence){return billingCall('checkout',{salon_id:salonId,plan,...(cadence?{cadence}:{}),request_id:requestId,...(termsVersion?{terms_version:termsVersion}:{})});},
      billingChange(plan,salonId,requestId,termsVersion,cadence){return billingCall('change',{salon_id:salonId,plan,...(cadence?{cadence}:{}),request_id:requestId,...(termsVersion?{terms_version:termsVersion}:{})});},
      billingCancelChange(salonId,requestId){return billingCall('cancel-change',{salon_id:salonId,request_id:requestId});},
      billingCancel(salonId,requestId){return billingCall('cancel',{salon_id:salonId,request_id:requestId});},
      accessSnapshot(){return verifiedAccess?.ownerId===load()?.user?.id?verifiedAccess.data:null;},
      canWrite(salonId){return writeScope(salonId);},
      sessionIdentity() { return load()?.user?.id || null; },
      hasSession() { return !!load(); },
      async logout() { const t = load() && load().access_token; keep(null); if (t) call('/auth/v1/logout?scope=local', { token: t }); },
      markTrialUsed() {}
    });
  }

  const makeDirectory = (getState, save) => {
    const local = create(getState, save);
    return window.JOVA_SUPABASE ? createRemote(getState, save, local) : local;
  };

  window.JovaAccounts = { create: makeDirectory, normEmail, passwordIssues, PASSWORD_RULES, TRIAL_MS };
})();
