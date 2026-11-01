import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
function run(args, env = {}) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// These handlers use injected test transports, never real email or payment services.
run(['--test',
  'tests/contact-delivery.test.mjs', 'tests/quote-delivery.test.mjs',
  'tests/recaptcha-verification.test.mjs', 'tests/checkout.test.mjs',
  'tests/live-chat.test.mjs', 'tests/marketing-analytics.test.mjs',
  'tests/social-preview.test.mjs',
  'tests/jovabook-test-db.test.mjs', 'tests/jovabook-integrations.test.mjs', 'tests/jovabook-recovery-scheduler.test.mjs',
  'booking-demo/tests/commission-supervisor-sql.mjs',
  'booking-demo/tests/annual-billing.mjs', 'booking-demo/tests/annual-billing-backend.mjs',
  'booking-demo/tests/annual-subscriptions.mjs', 'booking-demo/tests/business-integrations.mjs',
  'tests/jovabook-email.test.mjs', 'tests/jovabook-email-sql.test.mjs',
  'booking-demo/tests/data-isolation-audit.mjs', 'booking-demo/tests/data-isolation-audit-sql.mjs',
  'booking-demo/tests/dashboard-core.mjs', 'booking-demo/tests/owner-tools.mjs',
  'booking-demo/tests/insights-clients.mjs', 'booking-demo/tests/essential-locks.mjs',
  'booking-demo/tests/premium-insights.mjs', 'booking-demo/tests/premium-website.mjs',
  'booking-demo/tests/premium-website-sql.mjs',
  'booking-demo/tests/workspace-themes.mjs', 'booking-demo/tests/service-management.mjs',
  'booking-demo/tests/category-colours.mjs',
  'booking-demo/tests/essential-package.mjs', 'booking-demo/tests/business-website.mjs',
  'booking-demo/tests/website-images.mjs', 'booking-demo/tests/website-images-sql.mjs',
  'booking-demo/tests/sms-reminders.mjs', 'booking-demo/tests/sms-provider.mjs',
  'booking-demo/tests/sms-reminders-sql.mjs',
  'booking-demo/tests/subscriptions.mjs', 'booking-demo/tests/billing-access.mjs',
  'booking-demo/tests/billing-plans.mjs', 'booking-demo/tests/existing-business.mjs',
  'booking-demo/tests/owner-signup-verification.mjs',
  'booking-demo/tests/billing-backend.mjs', 'booking-demo/tests/billing-lifecycle-sql.mjs',
  'booking-demo/tests/monthly-commission-backend.mjs', 'booking-demo/tests/monthly-commission-sql.mjs',
  'booking-demo/tests/customer-portal.mjs', 'booking-demo/tests/customer-portal-sql.mjs',
  'booking-demo/tests/commission.mjs', 'tests/jovabook-customer.test.mjs',
  'booking-demo/tests/booking-horizon.mjs', 'booking-demo/tests/booking-horizon-sql.mjs',
]);
// The SMS UI runs against its own intercepted server and cannot contact a provider.
run(['booking-demo/tests/sms-reminders-browser.mjs']);
// Every external Auth, billing, email and payment request is intercepted.
// These proofs each start their own local server, including on clean Linux CI.
for (const script of ['billing-access-browser','billing-plans-browser',
  'customer-portal-browser','customer-portal-integration-browser','existing-business-browser',
  'booking-horizon-browser']) {
  run(['booking-demo/tests/' + script + '.mjs']);
}
if (!process.env.REGRESSION_URL) {
  run(['node_modules/next/dist/bin/next', 'build'], { JOVA_BUILD_DIR: '.next-regression' });
  run(['scripts/audit-function-traces.mjs', '.next-regression']);
}
run(['node_modules/@playwright/test/cli.js', 'test']);
