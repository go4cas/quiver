import { test, expect } from '@playwright/test'

// N73: a script reload (location.reload(), which Vite's dev server uses for a
// full reload when a page is added or removed, S-11) loads a new document
// instead of being intercepted as an in-app navigation.
test('location.reload() loads a new document and renders the same route', async ({ page }) => {
  await page.goto('users')
  await expect(page.getByRole('heading', { name: /Team\s+3/ })).toBeVisible()
  await page.evaluate(() => { /** @type {any} */ (window).__quiverMarker = 1 })

  await Promise.all([page.waitForEvent('load'), page.evaluate(() => location.reload())])

  expect(await page.evaluate(() => /** @type {any} */ (window).__quiverMarker)).toBeUndefined()
  await expect(page).toHaveURL('users')
  await expect(page.getByRole('heading', { name: /Team\s+3/ })).toBeVisible()
})
