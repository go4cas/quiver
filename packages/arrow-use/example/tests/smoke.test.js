import { test, expect } from '@playwright/test'

// TECH-SPEC U-11: the vanilla Arrow example uses all four composables, with only
// @arrow-js/core and arrow-use behind an import map.

test('useFetch renders the fetched list', async ({ page }) => {
  await page.goto('./')
  const list = page.getByRole('region', { name: 'useFetch' }).getByRole('listitem')
  await expect(list).toHaveText(['useFetch', 'useStorage', 'useMediaQuery', 'useEventListener'])
  await expect(page.getByText('Status 200')).toBeVisible()
})

test('useStorage keeps its value across a reload', async ({ page }) => {
  await page.goto('./')
  const clicks = page.getByTestId('clicks')
  await expect(clicks).toHaveText('Clicks: 0')
  await page.getByRole('button', { name: 'Add one' }).click()
  await page.getByRole('button', { name: 'Add one' }).click()
  await expect(clicks).toHaveText('Clicks: 2')
  expect(await page.evaluate(() => localStorage.getItem('arrow-use-example:clicks'))).toBe('2')
  await page.reload()
  await expect(clicks).toHaveText('Clicks: 2')
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(clicks).toHaveText('Clicks: 0')
})

test('useStorage follows another tab', async ({ page, context }) => {
  await page.goto('./')
  const other = await context.newPage()
  await other.goto(page.url())
  await other.getByRole('button', { name: 'Add one' }).click()
  await expect(page.getByTestId('clicks')).toHaveText('Clicks: 1')
})

test('useMediaQuery follows the colour scheme without a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('./')
  await page.evaluate(() => { /** @type {any} */ (window).__marker = 1 })
  await expect(page.getByTestId('scheme')).toHaveText('Colour scheme: light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.getByTestId('scheme')).toHaveText('Colour scheme: dark')
  expect(await page.evaluate(() => /** @type {any} */ (window).__marker)).toBe(1)
})

test('useEventListener reports key presses', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('key')).toHaveText('Last key: none')
  await page.keyboard.press('k')
  await expect(page.getByTestId('key')).toHaveText('Last key: k')
})

test('loads one @arrow-js/core, arrow-use unbundled, and nothing from another origin', async ({ page, baseURL }) => {
  /** @type {string[]} */
  const requests = []
  page.on('request', (req) => requests.push(req.url()))
  await page.goto('./')
  await expect(page.getByRole('listitem')).toHaveCount(4)

  const origin = new URL(/** @type {string} */ (baseURL)).origin
  expect(requests.filter((url) => new URL(url).origin !== origin)).toEqual([])
  const arrowEntries = [...new Set(requests.filter((url) => /@arrow-js\/core\/dist\/index(\.min)?\.m?js$/.test(url)))]
  expect(arrowEntries).toEqual([new URL('vendor/@arrow-js/core/dist/index.mjs', baseURL).href])
  for (const file of ['index', 'useFetch', 'useStorage', 'useMediaQuery', 'useEventListener']) {
    expect(requests).toContain(new URL(`vendor/arrow-use/src/${file}.js`, baseURL).href)
  }
})
