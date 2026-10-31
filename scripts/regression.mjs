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
  'tests/jovabook-test-db.test.mjs',
  'tests/jovabook-email.test.mjs', 'tests/jovabook-email-sql.test.mjs',
  'booking-demo/tests/data-isolation-audit.mjs', 'booking-demo/tests/data-isolation-audit-sql.mjs',
  'booking-demo/tests/workspace-themes.mjs', 'booking-demo/tests/service-management.mjs',
  'booking-demo/tests/category-colours.mjs',
  'booking-demo/tests/essential-package.mjs', 'booking-demo/tests/business-website.mjs',
  'booking-demo/tests/website-images.mjs', 'booking-demo/tests/website-images-sql.mjs',
]);
if (!process.env.REGRESSION_URL) {
  run(['node_modules/next/dist/bin/next', 'build'], { JOVA_BUILD_DIR: '.next-regression' });
  run(['scripts/audit-function-traces.mjs', '.next-regression']);
}
run(['node_modules/@playwright/test/cli.js', 'test']);
