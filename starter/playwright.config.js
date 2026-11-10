import { defineConfig } from '@playwright/test'

// Projects:
//   root            behaviour tests at / (`bun run test:e2e`)
//   subpath         the same tests with the app served under /sub/app/ (TECH-SPEC CI-2)
//   visual-desktop  screenshot parity at 1280×800 (`bun run test:visual`)
//   visual-mobile   screenshot parity at 390×844
// E2E tests navigate with relative URLs (`goto('users')`, `goto('./')`), never a
// leading '/', which Playwright resolves against the origin and so would drop the
// base (CI-3). The visual projects only match inside the pinned Playwright image;
// see tests/visual/README.md.
const ROOT = 'http://localhost:5173/'
const SUBPATH = 'http://localhost:5174/sub/app/'

export default defineConfig({
  use: {
    baseURL: ROOT,
  },
  expect: {
    toHaveScreenshot: {
      threshold: 0.02,
      maxDiffPixelRatio: 0.0001,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  projects: [
    {
      name: 'root',
      testDir: './tests/e2e',
      use: { baseURL: ROOT },
    },
    {
      name: 'subpath',
      testDir: './tests/e2e',
      use: { baseURL: SUBPATH },
    },
    {
      name: 'visual-desktop',
      testDir: './tests/visual',
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'visual-mobile',
      testDir: './tests/visual',
      use: { viewport: { width: 390, height: 844 } },
    },
  ],
  // Fixed ports with --strictPort, so workspace runs can't collide (CI-1).
  webServer: [
    {
      command: 'vite --port 5173 --strictPort',
      url: ROOT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'vite --port 5174 --strictPort',
      env: { QUIVER_BASE: '/sub/app/' },
      url: SUBPATH,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
