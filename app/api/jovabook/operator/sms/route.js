import {createOperatorSmsHandler} from '@/lib/jovabook-sms.mjs';
export const runtime='nodejs';
export const maxDuration=30;
export const POST=createOperatorSmsHandler();
