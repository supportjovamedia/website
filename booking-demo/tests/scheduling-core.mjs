import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context = {window: {}};
vm.runInNewContext(await readFile(new URL('../scheduling-core.js', import.meta.url), 'utf8'), context);
const core = context.window.JovaSchedule;
const plain = value => JSON.parse(JSON.stringify(value));
const hours = {start:'09:00', end:'18:00', days:[1,2,3,4,5]};
test('legacy hours and independent daily overrides normalize without opening closed days', () => {
  assert.deepEqual(plain(core.day(hours, 0)), {closed:true,start:'09:00',end:'18:00'});
  const h = core.normalize({...hours,weekly:{'1':{closed:false,start:'10:00',end:'16:00'},'2':{closed:true,start:'09:00',end:'18:00'}}});
  assert.deepEqual(plain(h.days), [1,3,4,5]);
  assert.equal(h.weekly['1'].start, '10:00');
  assert.equal(core.day(h, 2).closed, true);
  assert.equal(core.day({...hours,weekly:{'1':{closed:false,start:'18:00',end:'09:00'}}}, 1).closed, true);
  assert.deepEqual(plain(core.normalize({...hours,days:[]})).days, []);
  const closed=core.normalize({...hours,weekly:Object.fromEntries(Array.from({length:7},(_,d)=>[d,{closed:true,start:'09:00',end:'18:00'}]))});
  assert.deepEqual(plain(closed.days), []);
});
test('staff inherit business hours or intersect both schedules', () => {
  const salon={hours};
  assert.deepEqual(plain(core.hoursFor(salon, {hours:null,active:true}, '2030-01-07')), {closed:false,start:'09:00',end:'18:00'});
  assert.deepEqual(plain(core.hoursFor(salon, {hours:{start:'08:00',end:'16:00',days:[1]}}, '2030-01-07')), {closed:false,start:'09:00',end:'16:00'});
  assert.equal(core.hoursFor(salon, {hours:{start:'09:00',end:'18:00',days:[0]}}, '2030-01-06').closed, true);
  assert.equal(core.hoursFor(salon, {hours:null,active:false}, '2030-01-07').closed, true);
  assert.equal(core.hoursFor(salon, {hours:null}, '2030-02-31').closed, true);
});
test('only trusted plan inputs select the calendar entitlement', () => {
  assert.deepEqual(plain(core.plan({workspace:{plan:'Premium'}})), {name:'Essential',staffLimit:1});
  assert.deepEqual(plain(core.plan({plan:'Standard'})), {name:'Standard',staffLimit:5});
  assert.deepEqual(plain(core.plan({plan:'Essential',entitlements:{plan:'premium'}})), {name:'Premium',staffLimit:10});
});
