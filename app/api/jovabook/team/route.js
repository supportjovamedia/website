import {createJovaBookTeamHandlers} from '@/lib/jovabook-team.mjs';
export const runtime='nodejs';
export const POST=createJovaBookTeamHandlers().manage;
