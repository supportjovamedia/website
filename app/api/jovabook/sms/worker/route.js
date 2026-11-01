import {createBookingSmsHandlers} from '@/lib/jovabook-sms.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export const POST=createBookingSmsHandlers().worker;
