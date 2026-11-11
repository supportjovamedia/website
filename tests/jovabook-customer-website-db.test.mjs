import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { bootstrap, sources } from '../scripts/jovabook-test-db.mjs';

test('database exposes only public website fields and honours the owner choice', async () => {
  const db = new PGlite();
  try {
    await bootstrap(db, await sources());
    const first = 'fictional-business-1';
    const second = 'fictional-business-2';
    const owner = '10000000-0000-4000-8000-000000000001';
    const read = async slug => (await db.query(
      'select public.public_customer_website($1) as site', [slug],
    )).rows[0].site;
    const sitemap = async () => (await db.query(
      'select public.customer_website_sitemap() as slugs',
    )).rows[0].slugs;
    const saveWebsite = async (showInSearch, hideAddress) => {
      await db.exec('set role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
      await db.query(
        "select public.save_salon('Fictional Business 1','public@example.test','01234567890','Fictional street',$1,'{}','{}')",
        [{ workspace: { website: { version: 1, headline: 'Welcome', about: 'Haircuts', showInSearch, hideAddress, unexpected: 'secret' } } }],
      );
      await db.exec('reset role');
    };

    await db.exec('set role anon');
    assert.equal((await read(first)).searchable, false);
    assert.deepEqual(await sitemap(), []);
    assert.equal(await read('unknown-business'), null);
    await db.exec('reset role');

    await saveWebsite(true, true);
    await db.exec('set role anon');
    const site = await read(first);
    assert.equal(site.searchable, true);
    assert.equal(site.address, '');
    assert.equal(site.services[0].name, 'Test consultation');
    assert.equal(site.workspace.website.unexpected, undefined);
    for (const key of ['owner_id', 'payments', 'staff', 'busy', 'bookings', 'settings']) {
      assert.equal(site[key], undefined, key);
    }
    assert.equal((await read(second)).searchable, false);
    assert.deepEqual(await sitemap(), [first]);
    await db.exec('reset role');

    await db.query('update auth.users set email_confirmed_at=null where id=$1', [owner]);
    assert.equal((await read(first)).searchable, false);
    assert.deepEqual(await sitemap(), []);
    await db.query('update auth.users set email_confirmed_at=now() where id=$1', [owner]);

    await saveWebsite(false, false);
    await db.exec('set role anon');
    assert.equal((await read(first)).searchable, false);
    assert.equal((await read(first)).address, 'Fictional street');
    assert.deepEqual(await sitemap(), []);
  } finally {
    await db.close();
  }
});
