import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
if (!existsSync('.next-regression/BUILD_ID')) throw new Error('The production build must finish before performance can be audited.');
let failed = false;
for (const formFactor of ['mobile', 'desktop']) {
  console.log(`Auditing production build on ${formFactor}, three fresh visits per page.`);
  const result = spawnSync(process.execPath, ['node_modules/@lhci/cli/src/cli.js', 'autorun', '--config=./lighthouserc.cjs'], {
    stdio: 'inherit',
    env: { ...process.env, LHCI_FORM_FACTOR: formFactor },
  });
  if (result.error) throw result.error;
  failed ||= result.status !== 0;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `\n${formFactor}: ${result.status === 0 ? 'Performance budgets passed' : 'Performance budget failed; inspect the Lighthouse artifact'}. Three fresh visits to Home, About, Services, Our work, Pricing, Contact, Websites and CRM. These production-build audits include the consent notice. Production chat and consented analytics are verified separately on the live domain.\n`);
}
process.exitCode = failed ? 1 : 0;
