import { test, expect } from '@playwright/test'

// TECH-SPEC CI-5 (SPEC R5, R6): no bundler, one Arrow copy. Every module comes
// from this server, and @arrow-js/core loads from exactly one entry URL, which
// both the app and Quiver's own files resolve to through the import map. A second
// copy (a CDN `+esm` bundle, a relative import into node_modules) would show up
// as a second Arrow entry URL, and its reactive() would not drive this one's html.

test('loads one @arrow-js/core and nothing from another origin', async ({ page, baseURL }) => {
  /** @type {string[]} */
  const requests = []
  page.on('request', (req) => requests.push(req.url()))

  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  // Visit every route, so each lazily imported page module is requested too.
  await page.getByRole('link', { name: 'About' }).click()
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()
  await page.getByRole('link', { name: 'User 1' }).click()
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible()

  const origin = new URL(/** @type {string} */ (baseURL)).origin
  expect(requests.filter((url) => new URL(url).origin !== origin)).toEqual([])

  const arrowEntries = [...new Set(requests.filter((url) => /@arrow-js\/core\/dist\/index(\.min)?\.m?js$/.test(url)))]
  expect(arrowEntries).toEqual([new URL('vendor/@arrow-js/core/dist/index.mjs', baseURL).href])
  // Quiver's source files are served unbundled from its package.
  expect(requests).toContain(new URL('vendor/@go4cas/quiver/src/router.js', baseURL).href)
})
