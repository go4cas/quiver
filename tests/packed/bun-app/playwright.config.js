import { defineConfig } from '@playwright/test'

// The Bun.build output served at / and under /sub/app/ (TECH-SPEC CI-5). The
// same dist/ serves both: the base comes from <base href> at serve time. Tests
// navigate with relative URLs, never a leading '/' (CI-3).
const ROOT = 'http://localhost:5186/'
const SUBPATH = 'http://localhost:5196/sub/app/'

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    { name: 'root', use: { baseURL: ROOT } },
    { name: 'subpath', use: { baseURL: SUBPATH } },
  ],
  webServer: [
    {
      command: 'bun build.js && bun serve.js',
      env: { PORT: '5186' },
      url: ROOT,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Playwright starts web servers in order, so dist/ is built by now.
      command: 'bun serve.js',
      env: { PORT: '5196', QUIVER_BASE: '/sub/app/' },
      url: SUBPATH,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
