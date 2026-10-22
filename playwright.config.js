// Playwright test setup. See the "Testing" section of README.md.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  // Serves the site folder exactly as GitHub Pages would (plain static files).
  webServer: {
    command: 'node tests/support/serve.js',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    // Normal tests: outside services are faked (see tests/support/fixtures.js).
    { name: 'desktop', testIgnore: /live\//, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testIgnore: /live\//, use: { ...devices['Pixel 7'] } },
    // Opt-in checks against the real outside services: npm run test:live
    { name: 'live', testMatch: /live\/.*\.spec\.js/, timeout: 10 * 60 * 1000, use: { ...devices['Desktop Chrome'] } },
  ],
});
