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
        if (state.accounts.some(a => a.salonId === salonId)) return;
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

  window.JovaAccounts = { create, normEmail, passwordIssues, PASSWORD_RULES, TRIAL_MS };
})();
