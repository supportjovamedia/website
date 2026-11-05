import {regionEndpoint} from '@/lib/jovabook-region.mjs';
export const runtime='edge';
const endpoint=regionEndpoint();
export const GET=endpoint.GET;
export const OPTIONS=endpoint.OPTIONS;
