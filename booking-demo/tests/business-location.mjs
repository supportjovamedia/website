import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
function rules(access=null){const context={ownerAccessState:access};for(const name of ['businessAddressRequired','businessContactError'])vm.runInNewContext(source.match(new RegExp('^function '+name+'\\([^\\n]+$','m'))[0],context);return context;}
test('mobile and online businesses can save blank addresses but still need a valid phone',()=>{
 for(const serviceLocations of [['mobile'],['online'],['mobile','online']]){const r=rules(),s={id:'demo',serviceLocations};assert.equal(r.businessAddressRequired(s),false);assert.equal(r.businessContactError(s,'','+44 7700 900123'),'');assert.match(r.businessContactError(s,'','bad'),/phone/);}
});
test('physical, mixed and unknown businesses retain address validation',()=>{
 for(const serviceLocations of [undefined,[],['physical'],['physical','mobile'],['online','physical']]){const r=rules(),s={id:'demo',serviceLocations};assert.equal(r.businessAddressRequired(s),true);assert.match(r.businessContactError(s,'','+44 7700 900123'),/address/);assert.equal(r.businessContactError(s,'24 High Street','+44 7700 900123'),'');}
});
test('the current verified access response determines the live owner requirement',()=>{
 const s={id:'owned'},mobile=rules({business:{id:'owned'},address_required:false});assert.equal(mobile.businessContactError(s,'','+44 7700 900123'),'');
 const physical=rules({business:{id:'owned'},address_required:true});assert.match(physical.businessContactError(s,'','+44 7700 900123'),/address/);
 const unrelated=rules({business:{id:'another'},address_required:false});assert.match(unrelated.businessContactError(s,'','+44 7700 900123'),/address/);
});
