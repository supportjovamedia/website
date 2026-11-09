import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const window={};vm.runInNewContext(await readFile(new URL('../owner-client-import.js',import.meta.url),'utf8'),{window});const parse=window.JovaClientImport.parse;
test('CSV parser handles quoted names, BOM, CRLF and reordered columns',()=>{
 const rows=parse('\uFEFFemail,name,phone\r\nclient@example.test,"Smith, Taylor",\r\n');assert.equal(rows.length,1);assert.equal(rows[0].name,'Smith, Taylor');assert.equal(rows[0].phone,'');
});
test('CSV parser rejects malformed, oversized, missing and unsupported fields',()=>{
 for(const csv of ['name,email,phone\n','name,email,phone\nTaylor,no-email,','name,email,phone,notes\nTaylor,a@example.test,,private','name,email,phone\n"unfinished','name,email,phone\nTaylor,,','name,email,phone\nTaylor,a@example.test,\n'.repeat(10000)])assert.throws(()=>parse(csv));
});
