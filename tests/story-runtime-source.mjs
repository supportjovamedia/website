import {readFile} from 'node:fs/promises';

// Browser fixtures inline the real modules while blocking every network request.
export async function storyRuntimeSource(){
 const paths=['../lib/jovabook-demo.mjs','../lib/jovabook-offer.mjs','../lib/jovabook-marketing-plans.mjs','../app/jovabook/story/enhance-pricing.mjs','../app/jovabook/story/calculator.mjs','../app/jovabook/story/enhance-story.js'];
 return (await Promise.all(paths.map(path=>readFile(new URL(path,import.meta.url),'utf8')))).map(source=>source.replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'')).join('\n');
}
