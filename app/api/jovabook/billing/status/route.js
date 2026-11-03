import {after} from 'next/server';
import {createJovaBookBillingHandlers} from '@/lib/jovabook-billing.mjs';
export const runtime='nodejs';
export const POST=createJovaBookBillingHandlers({observe:callback=>after(callback)}).status;
