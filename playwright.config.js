/* AutoUniverse — Playwright config
   Todo #130 + #119. Testira PWA aplikacije (Garage + Driver).

   Run:
     npx playwright test                              # samo mobile (default, brzo ~14s)
     npx playwright test --project=chromium-desktop   # desktop Chrome (Todo #119)
     npx playwright test --project=all               # mobile + desktop
     npx playwright test driver                       # samo driver testovi
     npx playwright test --ui                         # interaktivan mod
     npx playwright test --headed                     # video-vidljiv mod
*/
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.PLAYWRIGHT_PORT ? Number(process.env.PLAYWRIGHT_PORT) : 4173;
const BASE = `http://localhost:${PORT}`;

// Koji projekti se pokreću po defaultu (mobile-only je brži za CI)
const DEFAULT_PROJECTS = (process.env.PW_ALL === '1')
  ? ['chromium-mobile', 'chromium-desktop']
  : ['chromium-mobile'];

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,          // PWA IndexedDB state — jedan test u trenutku
  retries: 0,
  workers: 1,
  reporter: [['list']],

  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Mobile (primarni — telefon je target)
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    // Desktop Chrome — pre deploya (Todo #119)
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  webServer: {
    command: `node tests/e2e/serve.js ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
