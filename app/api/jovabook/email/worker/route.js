import {createBookingEmailHandlers} from '@/lib/jovabook-email.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export const POST=createBookingEmailHandlers().worker;
