import { defineConfig } from '@playwright/test'

// A plain Arrow app (no Quiver router, no bundler) using the toasts recipe,
// served by e2e/serve.js. Fixed port (CI-1); Bun.serve fails if it is taken.
const URL = 'http://localhost:5184/'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: URL },
  webServer: {
    command: 'bun e2e/serve.js',
    env: { PORT: '5184' },
    url: URL,
    reuseExistingServer: !process.env.CI,
  },
})
