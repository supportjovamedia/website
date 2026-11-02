import {createJovaBookDepositHandlers} from '@/lib/jovabook-deposits.mjs';
export const runtime='nodejs';
const handlers=createJovaBookDepositHandlers();
export const POST=handlers.status;
export const OPTIONS=handlers.options;
