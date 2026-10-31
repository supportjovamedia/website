const desktop = process.env.LHCI_FORM_FACTOR === 'desktop';
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/serve-regression.mjs',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 30000,
      url: ['/', '/about', '/services', '/work', '/pricing', '/contact', '/websites', '/websites/crm-systems'].map(path => `http://127.0.0.1:4391${path}`),
      numberOfRuns: 3,
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        ...(desktop ? { preset: 'desktop' } : {}),
        ...(process.env.CI ? { chromeFlags: '--no-sandbox' } : {}),
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: desktop ? .95 : .9, aggregationMethod: 'median' }],
        'categories:accessibility': ['error', { minScore: .95, aggregationMethod: 'median' }],
        'categories:seo': ['error', { minScore: .95, aggregationMethod: 'median' }],
        'largest-contentful-paint': ['error', { maxNumericValue: desktop ? 2000 : 3500, aggregationMethod: 'median' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: .1, aggregationMethod: 'median' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `artifacts/lighthouse/${desktop ? 'desktop' : 'mobile'}`,
    },
  },
};
