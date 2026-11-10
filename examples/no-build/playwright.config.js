import { defineConfig } from '@playwright/test'

// Projects (TECH-SPEC CI-5): the unbundled source served at / and under /sub/app/.
// The same files serve both: the base comes from <base href> at serve time.
// Tests navigate with relative URLs, never a leading '/' (CI-3).
const ROOT = 'http://localhost:5182/'
const SUBPATH = 'http://localhost:5192/sub/app/'

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    { name: 'root', use: { baseURL: ROOT } },
    { name: 'subpath', use: { baseURL: SUBPATH } },
  ],
  // Fixed ports (CI-1). Bun.serve fails if the port is taken, like --strictPort.
  webServer: [
    {
      command: 'bun serve.js',
      env: { PORT: '5182' },
      url: ROOT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'bun serve.js',
      env: { PORT: '5192', QUIVER_BASE: '/sub/app/' },
      url: SUBPATH,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
