import { test, expect } from '@playwright/test'

const API = 'https://jsonplaceholder.typicode.com/posts'

// Audit R04 (N141): the Posts page sits inside the menu layout, where Arrow never
// runs onCleanup, so it stops its own requests from an afterEach hook.
test('leaving Posts aborts its in-flight request once, and a later visit starts fresh', async ({ page }) => {
  /** @type {import('@playwright/test').Route[]} */
  const held = []
  await page.route(API, (route) => { held.push(route) }) // never answered
  /** @type {string[]} */
  const failed = []
  page.on('requestfailed', (r) => { if (r.url() === API) failed.push(r.failure()?.errorText ?? '') })

  await page.goto('posts')
  await expect.poll(() => held.length).toBe(1)

  await page.getByRole('link', { name: 'Team' }).click()
  await expect(page).toHaveURL('users')
  await expect.poll(() => failed.length).toBe(1)

  await page.getByRole('link', { name: 'Posts' }).click()
  await expect(page).toHaveURL('posts')
  await expect.poll(() => held.length).toBe(2)
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect.poll(() => failed.length).toBe(2)
  // Navigating on again doesn't abort anything twice.
  await page.getByRole('link', { name: 'Team' }).click()
  await expect(page).toHaveURL('users')
  await page.waitForTimeout(200)
  expect(failed).toHaveLength(2)
})

test('the Posts page shows posts', async ({ page }) => {
  await page.route(API, (r) => r.fulfill({ json: [{ id: 1, userId: 1, title: 'Hello', body: 'World' }] }))
  await page.goto('posts')
  await expect(page.getByRole('heading', { name: 'Hello' })).toBeVisible()
})
