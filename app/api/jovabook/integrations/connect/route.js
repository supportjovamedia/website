import {createJovaBookIntegrationHandlers} from '@/lib/jovabook-integrations.mjs';
export const runtime='nodejs';
const handlers=createJovaBookIntegrationHandlers();
export const POST=handlers.connect;
export const OPTIONS=handlers.options;
