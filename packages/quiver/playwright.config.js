import { defineConfig } from '@playwright/test'

// Core's browser fixture (tests/browser/): navigation, history and metadata on
// the real Navigation API (NOTES N126–N129), once at / and once under
// /sub/app/ (CI-2). Fixed ports (CI-1); Bun.serve fails if one is taken.
const ROOT = 'http://127.0.0.1:5185/'
const SUBPATH = 'http://127.0.0.1:5195/sub/app/'

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '*.spec.js',
  projects: [
    { name: 'root', use: { baseURL: ROOT } },
    { name: 'subpath', use: { baseURL: SUBPATH } },
  ],
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
