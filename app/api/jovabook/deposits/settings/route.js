import {createJovaBookDepositHandlers} from '@/lib/jovabook-deposits.mjs';
export const runtime='nodejs';
const handlers=createJovaBookDepositHandlers();
export const POST=handlers.settings;
export const OPTIONS=handlers.options;
