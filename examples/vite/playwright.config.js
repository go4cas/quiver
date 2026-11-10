import { defineConfig } from '@playwright/test'

// Projects (TECH-SPEC CI-5):
//   dev      the Vite dev server at /
//   subpath  a production build (`vite build`) under /sub/app/, served by `vite preview`
// Tests navigate with relative URLs, never a leading '/' (CI-3).
const DEV = 'http://localhost:5180/'
const SUBPATH = 'http://localhost:5190/sub/app/'

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    { name: 'dev', use: { baseURL: DEV } },
    { name: 'subpath', use: { baseURL: SUBPATH } },
  ],
  // Fixed ports with --strictPort, so workspace runs can't collide (CI-1).
  webServer: [
    {
      command: 'vite --port 5180 --strictPort',
      url: DEV,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'vite build && vite preview --port 5190 --strictPort',
      env: { QUIVER_BASE: '/sub/app/' },
      url: SUBPATH,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
