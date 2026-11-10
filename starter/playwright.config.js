import { defineConfig } from '@playwright/test'

// Projects:
//   e2e             — behaviour tests (`bun run test:e2e`)
//   visual-desktop  — screenshot parity at 1280×800 (`bun run test:visual`)
//   visual-mobile   — screenshot parity at 390×844
// The visual projects only match inside the pinned Playwright image; see
// tests/visual/README.md.
export default defineConfig({
  use: {
    baseURL: 'http://localhost:5173',
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
      name: 'e2e',
      testDir: './tests/e2e',
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
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
