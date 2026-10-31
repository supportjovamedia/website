import {createBookingEmailHandlers} from '@/lib/jovabook-email.mjs';
export const runtime='nodejs';
export const POST=createBookingEmailHandlers().webhook;
