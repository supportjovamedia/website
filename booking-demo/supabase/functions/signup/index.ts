// Deployed to the "jovabook" Supabase project as the `signup` edge function.
// Creates the auth user (already confirmed, so the owner can carry on straight away)
// and the salon row, after re-checking everything the sign-up screen checked.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const fail = (field: string, message: string, status = 200) => json({ ok: false, field, message }, status);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, message: 'POST only.' }, 405);

  let b: Record<string, string>;
  try { b = await req.json(); } catch { return fail('', 'Bad request.', 400); }
  const name = String(b.name ?? '').trim(), slug = String(b.slug ?? '').trim().toLowerCase();
  const owner = String(b.owner ?? '').trim(), email = String(b.email ?? '').trim();
  const password = String(b.password ?? ''), device = String(b.device_id ?? '').slice(0, 64) || null;

  if (!name || name.length > 60) return fail('name', 'Enter your salon name.');
  if (!owner || owner.length > 80) return fail('owner', 'Enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return fail('email', 'Enter a valid email address.');
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || password.length > 72)
    return fail('password', 'Your password needs 8 or more characters, a capital letter and a number.');

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data: slugState } = await db.rpc('slug_status', { p_slug: slug });
  if (slugState === 'format') return fail('slug', 'Use 3 to 30 letters, numbers or hyphens.');
  if (slugState === 'reserved') return fail('slug', 'That address is reserved. Choose another.');
  if (slugState !== 'ok') return fail('slug', 'That address is taken. Choose another.');
  const { data: emailFree } = await db.rpc('email_available', { p_email: email });
  if (!emailFree) return fail('email', 'An account with this email already exists. Log in instead.');

  // Abuse checks: many sign-ups from one network or one device in a short time.
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const flags: string[] = [];
  if (ip) {
    const { count } = await db.from('salons').select('id', { count: 'exact', head: true }).eq('signup_ip', ip).gte('created_at', since);
    if ((count ?? 0) >= 5) return fail('email', 'Too many sign-ups from this network today. Try again tomorrow or contact support.', 429);
    if ((count ?? 0) >= 2) flags.push('many_signups_one_ip');
  }
  if (device) {
    const { count } = await db.from('salons').select('id', { count: 'exact', head: true }).eq('device_id', device);
    if ((count ?? 0) >= 2) flags.push('many_accounts_one_device');
  }

  const created = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { owner_name: owner } });
  if (created.error || !created.data.user) {
    const dup = /already|registered|exists/i.test(created.error?.message ?? '');
    return fail('email', dup ? 'An account with this email already exists. Log in instead.' : 'We couldn’t create your account. Try again.');
  }
  const uid = created.data.user.id;
  const ins = await db.from('salons').insert({
    owner_id: uid, name, slug, owner_name: owner, email, device_id: device, signup_ip: ip, flags,
  }).select('id').single();
  if (ins.error || !ins.data) {
    await db.auth.admin.deleteUser(uid);
    const msg = ins.error?.message ?? '';
    if (/slug/.test(msg)) return fail('slug', 'That address is taken. Choose another.');
    if (/email_norm/.test(msg)) return fail('email', 'An account with this email already exists. Log in instead.');
    return fail('', 'We couldn’t create your salon. Try again.');
  }
  return json({ ok: true, salon_id: ins.data.id });
});
