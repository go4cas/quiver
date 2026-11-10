// Visual-parity suite (planning/v3/DESIGN.md §8). Every state × 5 themes × 2 modes.
// Baselines live in __screenshots__/ and are only captured in the pinned Playwright
// image (mcr.microsoft.com/playwright, same version as bun.lock), never on macOS.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { STATES } from './states.js'

const posts = JSON.parse(readFileSync(new URL('./fixtures/posts.json', import.meta.url), 'utf8'))

const THEMES = ['default', 'mono', 'glass', 'retro', 'brutalist']
const MODES = ['light', 'dark']

for (const state of STATES) {
  for (const theme of THEMES) {
    for (const mode of MODES) {
      test(`${state.name} · ${theme} · ${mode}`, async ({ page }, info) => {
        test.skip(info.project.name === 'visual-mobile' && !state.mobile, 'desktop-only state')

        await page.addInitScript(([t, m]) => {
          localStorage.setItem('ui-theme', t)
          localStorage.setItem('ui-mode', m)
        }, [theme, mode])
        await page.route('https://jsonplaceholder.typicode.com/posts', (r) => r.fulfill({ json: posts }))
        await page.route('https://jsonplaceholder.typicode.com/does-not-exist-404', (r) =>
          r.fulfill({ status: 404, json: {} }),
        )

        await page.goto(state.path)
        await state.ready(page)

        // Settle: no hover, no focus ring, every image decoded, every font loaded.
        await page.mouse.move(0, 0)
        await page.evaluate(() => /** @type {HTMLElement | null} */ (document.activeElement)?.blur())
        await page.waitForFunction(() => [...document.images].every((img) => img.complete))
        await page.evaluate(() => document.fonts.ready)

        await expect(page).toHaveScreenshot(`${state.name}/${theme}-${mode}.png`, {
          fullPage: true,
          mask: state.mask?.(page) ?? [],
        })
      })
    }
  }
}
