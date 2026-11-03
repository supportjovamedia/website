import {createOwnerFunnel} from '@/lib/jovabook-owner-funnel.mjs';
export const runtime='nodejs';
const funnel=createOwnerFunnel();
export const POST=funnel.endpoint;
export const OPTIONS=funnel.options;
