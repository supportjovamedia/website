import {createJovaBookOAuthHandlers} from '@/lib/jovabook-integration-oauth.mjs';
export const runtime='nodejs';
export const GET=createJovaBookOAuthHandlers().callback;
