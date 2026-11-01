import {createMonthlyCommission} from '@/lib/jovabook-monthly-commission.mjs';
export const runtime='nodejs';
export const POST=createMonthlyCommission().handler;
