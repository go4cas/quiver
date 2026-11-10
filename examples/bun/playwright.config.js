import { defineConfig } from '@playwright/test'

// Projects (TECH-SPEC CI-5): the Bun.build output served at / and under /sub/app/.
// The same dist/ serves both: the base comes from <base href> at serve time.
// Tests navigate with relative URLs, never a leading '/' (CI-3).
const ROOT = 'http://localhost:5181/'
const SUBPATH = 'http://localhost:5191/sub/app/'

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    { name: 'root', use: { baseURL: ROOT } },
    { name: 'subpath', use: { baseURL: SUBPATH } },
  ],
  // Fixed ports (CI-1). Bun.serve fails if the port is taken, like --strictPort.
  webServer: [
    {
      command: 'bun build.js && bun serve.js',
      env: { PORT: '5181' },
      url: ROOT,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Playwright starts web servers in order, so dist/ is built by now.
      command: 'bun serve.js',
      env: { PORT: '5191', QUIVER_BASE: '/sub/app/' },
      url: SUBPATH,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
