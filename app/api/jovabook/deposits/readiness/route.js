import {createJovaBookDepositReadinessHandlers} from '@/lib/jovabook-deposit-readiness.mjs';
export const runtime='nodejs';
const handlers=createJovaBookDepositReadinessHandlers();
export const POST=handlers.readiness;
export const OPTIONS=handlers.options;
