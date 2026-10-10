import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Linter} from 'eslint';

test('booking client modules do not reference undefined variables',async()=>{
 const linter=new Linter();
 for(const name of ['BookingApp.js','BookingFlow.js','customer.js','ServiceMenu.js','api.js']){
  const source=await fs.readFile(new URL('../app/preview/booking/'+name,import.meta.url),'utf8');
  const messages=linter.verify(source,{languageOptions:{ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},globals:Object.fromEntries(['window','document','location','history','fetch','URL','URLSearchParams','crypto','sessionStorage','localStorage','setTimeout','clearTimeout','requestAnimationFrame','cancelAnimationFrame','AbortController','FormData','navigator'].map(key=>[key,'readonly']))},rules:{'no-undef':'error'}});
  assert.deepEqual(messages.map(message=>`${name}:${message.line} ${message.message}`),[]);
 }
});
