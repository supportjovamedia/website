import {createJovaBookBillingHandlers} from '@/lib/jovabook-billing.mjs';
export const runtime='nodejs';
export const POST=createJovaBookBillingHandlers().webhook;
