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
    const keep = s => { try { s ? localStorage.setItem(AUTH, JSON.stringify(s)) : localStorage.removeItem(AUTH); } catch (e) {} };
    async function call(path, { method = 'POST', body, token, headers } = {}) {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
      try {
        const r = await fetch(cfg.url + path, { method, signal: ctl.signal, body: body === undefined ? undefined : JSON.stringify(body),
          headers: Object.assign({ apikey: cfg.key, 'Content-Type': 'application/json' }, (token || /^eyJ/.test(cfg.key)) ? { Authorization: 'Bearer ' + (token || cfg.key) } : {}, headers || {}) });
        let data = null; try { data = await r.json(); } catch (e) {}
        return { ok: r.ok, status: r.status, data };
      } catch (e) { return { ok: false, status: 0, data: null, network: true }; }
      finally { clearTimeout(timer); }
    }
    const rpc = (fn, args, token) => call('/rest/v1/rpc/' + fn, { body: args || {}, token });
    const NET = 'We couldn’t reach the server. Check your connection and try again.';
    async function token() {
      const s = load(); if (!s) return null;
      if (s.expires_at * 1000 > Date.now() + 30000) return s.access_token;
      const r = await call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } });
      if (r.ok && r.data && r.data.access_token) { keep(r.data); return r.data.access_token; }
      keep(null); return null;
    }
    async function signInPassword(email, password) {
      const r = await call('/auth/v1/token?grant_type=password', { body: { email: String(email).trim(), password } });
      if (r.ok && r.data && r.data.access_token) keep(r.data);
      return r;
    }
    async function mySalon() {
      const t = await token(); if (!t) return null;
      const r = await call('/rest/v1/salons?select=*&limit=1', { method: 'GET', token: t });
      return r.ok && Array.isArray(r.data) ? r.data[0] || null : null;
    }
    const isDemo = email => normEmail(email) === DEMO;

    return Object.assign({}, local, {
      remote: true,

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
      async register({ name, slug, owner, email, password }) {
        const r = await call('/functions/v1/signup', { body: { name, slug, owner, email, password, device_id: deviceId() } });
        if (r.network || !r.data) return { ok: false, field: '', message: NET };
        if (!r.data.ok) return { ok: false, field: r.data.field || '', message: r.data.message || 'We couldn’t create your account.' };
        const s = await signInPassword(email, password);
        if (!s.ok) return { ok: false, field: '', message: 'Your account was created. Log in to continue.' };
        return { ok: true, account: { salonId: r.data.salon_id } };
      },
      async login(email, password) {
        if (isDemo(email)) return local.login(email, password);
        const r = await signInPassword(email, password);
        if (r.network) return { ok: false, message: NET };
        if (r.status === 429) return { ok: false, locked: true, message: 'Too many attempts. Wait a minute, then try again.' };
        if (!r.ok) return { ok: false, message: 'That email and password do not match.' };
        const row = await mySalon();
        if (!row) { keep(null); return { ok: false, message: 'That email and password do not match.' }; }
        return { ok: true, account: { salonId: row.id }, salon: row };
      },
      async requestReset(email) {
        if (isDemo(email)) return local.requestReset(email);
        await call('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + '/'), { body: { email: String(email).trim() } });
        return { ok: true, sent: true };   // same answer whether or not the account exists
      },
      async resetPassword(tok, password) {
        if (passwordIssues(password).length) return { ok: false, message: 'Your password needs 8 or more characters, a capital letter and a number.' };
        if ((getState().resets || []).some(x => x.token === tok)) return local.resetPassword(tok, password);
        const r = await call('/auth/v1/user', { method: 'PUT', body: { password }, token: tok });
        if (r.network) return { ok: false, message: NET };
        if (!r.ok) return { ok: false, message: /same|different/i.test((r.data && (r.data.msg || r.data.message)) || '') ? 'Choose a password you haven’t used before.' : 'This link has expired. Request a new one.' };
        keep(null);
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
        if (!t) return {ok:false, auth:true, message:'Your session has ended. Log in again.'};
        const r = await rpc(fn, args, t);
        return {ok:r.ok, data:r.data, network:r.network, message:r.data?.message || (r.network ? NET : 'We could not save that change. Please try again.')};
      },
      async loadActivity(salonId, since) {
        const t = await token();
        if (!t) return {ok:false, auth:true};
        const after = since && Number.isFinite(Date.parse(since)) ? '&updated_at=gte.' + encodeURIComponent(new Date(since).toISOString()) : '';
        const r = await call('/rest/v1/email_log?select=*&salon_id=eq.' + encodeURIComponent(salonId) + after + '&order=updated_at.desc&limit=200', {method:'GET', token:t});
        return {ok:r.ok && Array.isArray(r.data), rows:r.ok && Array.isArray(r.data) ? r.data : []};
      },
      async emailDeliveryInfo() {
        const t = await token();
        if (!t) return {ok:false, auth:true};
        const r = await rpc('email_delivery_info', {}, t), data = r.data;
        if (!r.ok || !data || typeof data.enabled !== 'boolean' || data.provider !== 'Resend' || data.reminder_hours !== 24) return {ok:false, network:r.network};
        return {ok:true, data:{enabled:data.enabled, provider:data.provider, reminder_hours:data.reminder_hours}};
      },
      async ownerCapabilities() {
        const t = await token();
        if (!t) return null;
        const r = await rpc('owner_capabilities', {}, t);
        return r.ok && r.data ? r.data : null;
      },
      async loadDiary() {
        const t = await token(); if (!t) return { ok: false, auth: true };
        const get = q => call('/rest/v1/' + q + '&limit=5000', { method: 'GET', token: t });
        const names = ['categories', 'staff', 'services', 'customers', 'bookings', 'email_log', 'payments'];
        const orders = ['created_at,id', 'created_at,id', 'created_at,id', 'created_at,id', 'date,time', 'sent_at.desc', 'created_at.desc'];
        const res = await Promise.all([get('salons?select=*')].concat(names.map((n, i) => get(n + '?select=*&order=' + orders[i]))));
        const emailIndex=names.indexOf('email_log')+1;
        const core=res.filter((r,index)=>index!==emailIndex);
        if (core.some(r => !r.ok || !Array.isArray(r.data))) return { ok: false, network: core.some(r => r.network), auth: core.some(r => r.status === 401) };
        const emailActivityUnavailable=!res[emailIndex].ok || !Array.isArray(res[emailIndex].data);
        const rows = {}; names.forEach((n, i) => { rows[n] = n==='email_log'&&emailActivityUnavailable?[]:res[i + 1].data; });
        return { ok: true, salon: res[0].data[0] || null, rows, emailActivityUnavailable };
      },
      async upsertRows(table, rows) {
        if (table === 'email_log') return {ok:false, status:403, message:'Email delivery records are read-only.'};
        const t = await token(); if (!t) return { ok: false, auth: true };
        const r = await call('/rest/v1/' + table + '?on_conflict=salon_id,id', { token: t, body: rows, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
        return { ok: r.ok, network: r.network, status: r.status, message: r.data && r.data.message };
      },
      async deleteRows(table, salonId, ids) {
        if (table === 'email_log') return {ok:false, status:403, message:'Email delivery records are read-only.'};
        const t = await token(); if (!t) return { ok: false, auth: true };
        const list = ids.map(i => '"' + String(i).replace(/"/g, '') + '"').join(',');
        const r = await call('/rest/v1/' + table + '?salon_id=eq.' + salonId + '&id=in.(' + encodeURIComponent(list) + ')', { method: 'DELETE', token: t, headers: { Prefer: 'return=minimal' } });
        return { ok: r.ok, network: r.network, status: r.status };
      },
      async saveSalon(a) {
        const t = await token(); if (!t) return { ok: false, auth: true };
        const r = await rpc('save_salon', a, t);
        return { ok: r.ok, network: r.network, status: r.status, message: r.data && r.data.message };
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
      sessionIdentity() { return load()?.user?.id || null; },
      hasSession() { return !!load(); },
      async logout() { const t = load() && load().access_token; keep(null); if (t) call('/auth/v1/logout', { token: t }); },
      markTrialUsed() {}
    });
  }

  const makeDirectory = (getState, save) => {
    const local = create(getState, save);
    return window.JOVA_SUPABASE ? createRemote(getState, save, local) : local;
  };

  window.JovaAccounts = { create: makeDirectory, normEmail, passwordIssues, PASSWORD_RULES, TRIAL_MS };
})();
