import { createCustomerWebsite } from '@/lib/jovabook-customer-website.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = createCustomerWebsite({ redirectLegacy: true });
