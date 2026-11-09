import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../list-pages.js',import.meta.url),'utf8');
const setup=()=>{const context={window:{}};vm.runInNewContext(source,context);return context.window.JovaListPages;};
const items=n=>Array.from({length:n},(_,i)=>({id:String(i)}));
test('20 records need no pager, the 21st creates a bounded second page',()=>{
 const api=setup();assert.equal(api.take('Customers',items(20),'a').footer,'');
 let page=api.take('Customers',items(21),'a');assert.equal(page.items.length,20);assert(page.footer.includes('Page 1 of 2'));
 assert(api.move('Customers',1));page=api.take('Customers',items(21),'a');assert.equal(page.items.length,1);assert.equal(page.items[0].id,'20');assert.equal(api.move('Customers',1),false);
 assert(api.move('Customers',-1));assert.equal(api.move('Customers',-1),false);
});
test('filters and business identity reset the page and deleted records clamp the last page',()=>{
 const api=setup();api.take('Bookings',items(45),'a','all');api.move('Bookings',1);api.move('Bookings',1);
 assert.equal(api.take('Bookings',items(21),'a','all').page,1);
 assert.equal(api.take('Bookings',items(45),'a','confirmed').page,0);
 api.move('Bookings',1);assert.equal(api.take('Bookings',items(45),'b','confirmed').page,0);
});
test('pagination does not mutate records and list states stay independent',()=>{
 const api=setup(),data=items(45),before=JSON.stringify(data);api.take('Customers',data,'a');api.take('Staff',data,'a');api.move('Customers',1);
 assert.equal(api.take('Staff',data,'a').page,0);assert.equal(api.take('Customers',data,'a').page,1);assert.equal(JSON.stringify(data),before);assert.equal(api.move('Customers',100),false);
});
