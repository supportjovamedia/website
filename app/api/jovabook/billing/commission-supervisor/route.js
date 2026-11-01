import {createMonthlyCommission} from '@/lib/jovabook-monthly-commission.mjs';
export const runtime='nodejs';
export const maxDuration=300;
export const POST=createMonthlyCommission().supervisorHandler;
