import {createJovaBookCustomerHandlers} from '@/lib/jovabook-customer.mjs';
export const runtime='nodejs';
const handlers=createJovaBookCustomerHandlers();
export const POST=handlers.paymentMethod;
export const OPTIONS=handlers.options;
