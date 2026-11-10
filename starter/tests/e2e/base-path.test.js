import { test, expect } from '@playwright/test'

// TECH-SPEC CI-4 (SPEC P3 Done-when). Runs in both projects; the link outside
// the base only means something under the sub-path, where '/outside' is not
// part of the app.

test('a deep link renders the route', async ({ page }) => {
  await page.goto('users/does-not-exist')
  await expect(page.getByText('User not found')).toBeVisible()
  await page.goto('users')
  await expect(page.getByRole('heading', { name: /Team\s+3/ })).toBeVisible()
})

test('back and forward move between routes', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.getByRole('link', { name: 'Team' }).click()
  await expect(page).toHaveURL('users')
  await page.getByRole('link', { name: 'Posts' }).click()
  await expect(page).toHaveURL('posts')

  await page.goBack()
  await expect(page).toHaveURL('users')
  await expect(page.getByRole('heading', { name: /Team\s+\d/ })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('./')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL('users')
  await expect(page.getByRole('heading', { name: /Team\s+\d/ })).toBeVisible()
})

test('links carry the base path', async ({ page, baseURL }) => {
  await page.goto('./')
  const href = await page.getByRole('link', { name: 'Team' }).getAttribute('href')
  expect(new URL(/** @type {string} */ (href), baseURL).href).toBe(new URL('users', baseURL).href)
})

test('a link outside the base loads a new document', async ({ page }, info) => {
  test.skip(info.project.name !== 'subpath', 'at the root every same-origin path is inside the base')
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.evaluate(() => {
    /** @type {any} */ (window).__quiverMarker = 1
    const a = document.createElement('a')
    a.href = '/outside'
    a.textContent = 'Outside the app'
    document.body.append(a)
  })
  await page.getByRole('link', { name: 'Outside the app' }).click()
  await page.waitForURL((u) => u.pathname === '/outside')
  await page.waitForLoadState('load')
  expect(await page.evaluate(() => /** @type {any} */ (window).__quiverMarker)).toBeUndefined()
})

test('Cmd/Ctrl-click opens a new tab and leaves the page alone', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  const team = page.getByRole('link', { name: 'Team' })
  await expect(team).toBeVisible()
  const before = page.url()
  // Record document requests from now on. This page makes none (it must not
  // navigate), so one for /users comes from the new tab. Checking the request,
  // not the new tab's load, keeps the test independent of how fast the dev
  // server answers a second tab under parallel load (N71).
  /** @type {string[]} */
  const opened = []
  context.on('request', (request) => {
    if (request.isNavigationRequest()) opened.push(request.url())
  })
  await team.click({ modifiers: ['ControlOrMeta'] })
  await expect.poll(() => opened.some((u) => new URL(u).pathname.endsWith('/users')), { timeout: 20000 }).toBe(true)
  expect(page.url()).toBe(before)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
