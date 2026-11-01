import {createJovaBookIntegrationHandlers} from '@/lib/jovabook-integrations.mjs';
export const runtime='nodejs';
export const maxDuration=300;
const handlers=createJovaBookIntegrationHandlers();
export const POST=handlers.worker;
export const OPTIONS=handlers.options;
