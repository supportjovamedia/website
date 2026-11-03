import {createOwnerFunnel} from '@/lib/jovabook-owner-funnel.mjs';
export const runtime='nodejs';
export const maxDuration=45;
export const POST=createOwnerFunnel().workerEndpoint;
