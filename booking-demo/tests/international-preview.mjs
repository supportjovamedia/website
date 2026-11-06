import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('local preview inline script is complete after HTML script parsing',async()=>{
 const html=await readFile(new URL('./international-preview.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(match=>match[1]);
 assert.equal(scripts.length,2);
 const inline=scripts.filter(Boolean);
 assert.equal(inline.length,1);
 assert.doesNotThrow(()=>new vm.Script(inline[0]));
 assert.match(inline[0],/querySelector\('script\[src="\/config.js"\]'\)\?\.remove\(\)/);
 assert.match(inline[0],/document\.write\(page\);document\.close\(\)/);
 let registered=false;
 const context={location:{hostname:'production.example.test'},document:{querySelector:()=>({set textContent(_value){registered=true;}}),addEventListener:()=>assert.fail('Production must not register fixture actions')}};
 vm.runInNewContext(inline[0],context);
 assert.equal(registered,true);
});
