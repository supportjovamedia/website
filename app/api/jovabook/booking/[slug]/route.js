import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createBookingEmbed} from '@/lib/jovabook-embed.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=createBookingEmbed({standalone:true,readShell:()=>readFile(path.join(process.cwd(),'booking-demo/dist/index.html'),'utf8')});
