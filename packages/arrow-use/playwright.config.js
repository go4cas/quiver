import { defineConfig } from '@playwright/test'

// The vanilla Arrow example (TECH-SPEC U-11), served unbundled by example/serve.js.
// Fixed port (CI-1); Bun.serve fails if it is taken, like --strictPort.
const URL = 'http://localhost:5183/'

export default defineConfig({
  testDir: './example/tests',
  use: { baseURL: URL },
  webServer: {
    command: 'bun example/serve.js',
    env: { PORT: '5183' },
    url: URL,
    reuseExistingServer: !process.env.CI,
  },
})
