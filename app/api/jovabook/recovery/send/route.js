import {createJovaBookIntegrationHandlers} from '@/lib/jovabook-integrations.mjs';
export const runtime='nodejs';
const handlers=createJovaBookIntegrationHandlers();
export const POST=handlers.send;
export const OPTIONS=handlers.options;
