import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {jovabookDemo} from '../lib/jovabook-demo.mjs';
import {jovabookStructuredData} from '../app/jovabook/search-data.mjs';
import {dialogs} from '../app/jovabook/story/sections.mjs';
import configuration from '../next.config.mjs';

test('demo URLs identify their exact contents and the MP4 supports progressive playback', async()=>{
  for(const url of [jovabookDemo.src,jovabookDemo.poster]){
    const bytes=await readFile(new URL('../public'+url,import.meta.url));
    const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
    assert.ok(url.includes(hash),'Changed media needs a fresh content-addressed URL');
    if(url.endsWith('.mp4')){
      const atoms=[];
      for(let offset=0;offset+8<=bytes.length;){
        const size=bytes.readUInt32BE(offset);assert.ok(size>=8);
        atoms.push(bytes.toString('ascii',offset+4,offset+8));offset+=size;
      }
      assert.ok(atoms.includes('moov')&&atoms.includes('mdat'));
      assert.ok(atoms.indexOf('moov')<atoms.indexOf('mdat'),'Playback metadata must precede video data');
    }
  }
});

test('player and video schema share current URLs and duration without automatic video loading',async()=>{
  assert.ok(dialogs.includes(`src="${jovabookDemo.src}"`));
  assert.ok(dialogs.includes(`poster="${jovabookDemo.poster}"`));
  assert.match(dialogs,/preload="none"/);assert.doesNotMatch(dialogs,/autoplay/i);
  const schema=jovabookStructuredData({video:jovabookDemo})['@graph'].find(item=>item['@type']==='VideoObject');
  assert.equal(schema.contentUrl,'https://www.jovamedia.com'+jovabookDemo.src);
  assert.equal(schema.thumbnailUrl,'https://www.jovamedia.com'+jovabookDemo.poster);
  assert.equal(schema.duration,'PT1M15S');assert.equal(schema.uploadDate,jovabookDemo.uploadDate);
  const headers=await (await configuration('phase-test')).headers();
  for(const source of ['/jovabook/demo-:hash.mp4','/jovabook/demo-poster-:hash.webp']){
    assert.equal(headers.find(item=>item.source===source).headers[0].value,'public, max-age=31536000, immutable');
  }
});
