import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../mobile-navigation.js',import.meta.url),'utf8');
function navigation(){const context={window:{}};vm.runInNewContext(source,context);return context.window.JovaMobileNavigation;}

test('owner navigation exposes the four primary destinations and one More dialog control',()=>{
 const api=navigation(),html=api.markup('calendar');
 assert.equal((html.match(/class="jg-mobile-bottom-item"/g)||[]).length,5);
 for(const route of ['dashboard','bookings','calendar','customers'])assert(html.includes('data-route="'+route+'"'));
 assert.match(html,/data-route="calendar" aria-current="page"/);
 assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
 assert.match(html,/data-action="workspace-more" aria-haspopup="dialog"/);
});

test('secondary routes mark More current without interpolating arbitrary active values',()=>{
 const api=navigation(),html=api.markup('services'),content=api.moreContent();
 assert.match(html,/data-action="workspace-more" aria-haspopup="dialog" aria-current="page"/);
 assert.equal((content.match(/data-action="workspace-more-route"/g)||[]).length,7);
 for(const route of ['services','staff','scheduling','insights','referrals','settings','integrations'])assert(content.includes('data-route="'+route+'"'));
 assert.match(content,/href="https:\/\/www\.jovamedia\.com\/\?support=chat#ex-support"[^>]*target="_blank"/);
 assert(!api.markup('<img src=x onerror=alert(1)>').includes('<img'));
});

test('staff route restrictions do not expose owner-only tools or an empty More drawer',()=>{
 const api=navigation(),options={allowedRoutes:['dashboard','calendar','bookings','customers']},html=api.markup('dashboard',options);
 assert.equal((html.match(/class="jg-mobile-bottom-item"/g)||[]).length,4);
 assert(!html.includes('data-action="workspace-more"'));
 assert(!api.moreContent(options).includes('<button'));assert(!api.moreContent(options).includes('Support'));
});
