import { defineConfig } from '@playwright/test'

// Core's browser fixture (tests/browser/): navigation, history and metadata on
// the real Navigation API (NOTES N126–N129), once at / and once under
// /sub/app/ (CI-2), in each engine (N155). Fixed ports (CI-1); Bun.serve
// fails if one is taken. `test:e2e` runs the Chromium projects; `test:browsers`
// runs all six and needs `playwright install firefox webkit`.
const ROOT = 'http://127.0.0.1:5185/'
const SUBPATH = 'http://127.0.0.1:5195/sub/app/'

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '*.spec.js',
  projects: ['chromium', 'firefox', 'webkit'].flatMap((browserName) => [
    { name: `${browserName}-root`, use: { browserName, baseURL: ROOT } },
    { name: `${browserName}-subpath`, use: { browserName, baseURL: SUBPATH } },
  ]),
  webServer: [
    {
      command: 'bun tests/browser/serve.js',
      env: { PORT: '5185', QUIVER_BASE: '/' },
      url: ROOT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'bun tests/browser/serve.js',
      env: { PORT: '5195', QUIVER_BASE: '/sub/app/' },
      url: SUBPATH,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
