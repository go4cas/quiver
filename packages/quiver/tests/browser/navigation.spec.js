// Navigation on the real Navigation API (NOTES N126–N129). The jsdom fake in
// tests/helpers/navigation.js can't show how a browser commits history
// entries, so these run against tests/browser/app.js in Chromium, Firefox and
// WebKit (N155; `bun run test:browsers`).
import { test, expect } from '@playwright/test'

/** @typedef {{ flags: { denyOverview: boolean, holdLogin: boolean, flakyLoads: boolean, bounce: string }, log: string[], go: (p: string) => Promise<void>, back: () => Promise<void>, forward: () => Promise<void>, release: (name: string) => void, status: () => string, path: () => string, retry: () => Promise<void>, destroy: () => void, start: () => Promise<void> }} Fixture */

/** @param {import('@playwright/test').Page} page */
async function open(page, path = './') {
  await page.goto(path)
  await expect(page.locator('#app h1')).toBeVisible()
}


test('R01: a cancel while a route is loading puts back the rendered page, URL and status', async ({ page, baseURL }) => {
  await open(page)
  await page.getByRole('link', { name: 'Slow' }).click()
  await expect(page.locator('#app')).toHaveText('Loading…')
  await page.getByRole('link', { name: 'Denied' }).click()
  await page.evaluate(() => /** @type {any} */ (window).fixture.release('slow'))
  await expect(page.locator('#app h1')).toHaveText('Overview')
  expect(await page.evaluate(() => /** @type {any} */ (window).fixture.status())).toBe('ready')
  expect(new URL(page.url()).pathname).toBe(new URL(/** @type {string} */ (baseURL)).pathname)
  await expect(page).toHaveTitle('Overview')
})

test('R02: a cancelled link click adds no history entry', async ({ page }) => {
  await open(page)
  await page.getByRole('link', { name: 'Details' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await page.getByRole('link', { name: 'Denied' }).click()
  await expect(page).toHaveURL(/details$/)
  await expect(page.locator('#app h1')).toHaveText('Details')

  await page.goBack()
  await expect(page.locator('#app h1')).toHaveText('Overview')
  await page.goForward()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await expect(page).toHaveURL(/details$/)
})

test('R02: a cancelled Back keeps the entry it was going to, query and hash included', async ({ page }) => {
  await open(page, './?tab=2#top')
  await page.getByRole('link', { name: 'Details' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await page.evaluate(() => { /** @type {any} */ (window).fixture.flags.denyOverview = true })
  await page.evaluate(() => /** @type {any} */ (window).fixture.back())
  await expect(page).toHaveURL(/details$/)
  await expect(page.locator('#app h1')).toHaveText('Details')

  await page.evaluate(() => { /** @type {any} */ (window).fixture.flags.denyOverview = false })
  await page.evaluate(() => /** @type {any} */ (window).fixture.back())
  await expect(page.locator('#app h1')).toHaveText('Overview')
  expect(new URL(page.url()).search + new URL(page.url()).hash).toBe('?tab=2#top')
})

/**
 * The history entries as base-relative paths (query and hash kept), and the
 * current position.
 * @param {import('@playwright/test').Page} page
 * @param {string | undefined} baseURL
 */
async function stack(page, baseURL) {
  const base = new URL(/** @type {string} */ (baseURL)).pathname
  return page.evaluate((base) => ({
    urls: navigation.entries().map((e) => {
      const u = new URL(/** @type {string} */ (e.url))
      return '/' + (u.pathname + u.search + u.hash).slice(base.length)
    }),
    index: navigation.currentEntry?.index,
  }), base)
}

/** @param {import('@playwright/test').Page} page @returns {Promise<boolean>} guards run before commit (N201) */
const precommit = (page) => page.evaluate(() => typeof (/** @type {any} */ (window).NavigationPrecommitController) === 'function')

test('R32-01: a cancelled push from the middle of history keeps the Forward entries', async ({ page, baseURL }) => {
  await open(page)
  await page.getByRole('link', { name: 'Details' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await page.getByRole('link', { name: 'Admin' }).click()
  await expect(page.locator('#app h1')).toHaveText('Login')
  await page.goBack()
  await expect(page.locator('#app h1')).toHaveText('Details')

  await page.getByRole('link', { name: 'Denied' }).click()
  await expect(page).toHaveURL(/details$/)
  await expect(page.locator('#app h1')).toHaveText('Details')
  // Without precommit handlers the denied push commits before the guards run,
  // and the browser drops the Forward entries with it (documented, N201).
  expect(await stack(page, baseURL)).toEqual(await precommit(page)
    ? { urls: ['/', '/details', '/login'], index: 1 }
    : { urls: ['/', '/details', '/denied'], index: 1 })

  if (await precommit(page)) {
    await page.goForward()
    await expect(page.locator('#app h1')).toHaveText('Login')
  }
})

test('R32-01: a cancel keeps a fragment the browser set natively', async ({ page, baseURL }) => {
  await open(page)
  await page.getByRole('link', { name: 'Details' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await page.evaluate(() => { location.hash = 'part' })
  await expect(page).toHaveURL(/details#part$/)

  await page.getByRole('link', { name: 'Denied' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await expect(page).toHaveURL(/details#part$/)
  const { urls, index } = await stack(page, baseURL)
  expect(urls.slice(0, 3)).toEqual(['/', '/details', '/details#part'])
  expect(index).toBe(2)
})

test('R32-01: a cancelled Back keeps every entry and the position', async ({ page, baseURL }) => {
  await open(page)
  await page.getByRole('link', { name: 'Details' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await page.evaluate(() => { /** @type {any} */ (window).fixture.flags.denyOverview = true })
  await page.evaluate(() => /** @type {any} */ (window).fixture.back())
  await expect(page.locator('#app h1')).toHaveText('Details')
  expect(await stack(page, baseURL)).toEqual({ urls: ['/', '/details'], index: 1 })
})

test('R32-01: a cancel while a route is loading goes back to the settled entry', async ({ page, baseURL }) => {
  await open(page)
  await page.getByRole('link', { name: 'Slow' }).click()
  await expect(page.locator('#app')).toHaveText('Loading…')
  await page.getByRole('link', { name: 'Denied' }).click()
  await expect(page.locator('#app h1')).toHaveText('Overview')
  await page.evaluate(() => /** @type {any} */ (window).fixture.release('slow'))
  await expect(page.locator('#app h1')).toHaveText('Overview')
  // The Slow push had committed; without precommit handlers the Denied push did too.
  expect(await stack(page, baseURL)).toEqual(await precommit(page)
    ? { urls: ['/', '/slow'], index: 0 }
    : { urls: ['/', '/slow', '/denied'], index: 0 })
})

test('R03: await go() waits for the redirect target and its guards', async ({ page }) => {
  await open(page)
  const result = await page.evaluate(async () => {
    const f = /** @type {any} */ (window).fixture
    f.flags.holdLogin = true
    let done = false
    const pending = f.go('/admin').then(() => { done = true })
    await new Promise((r) => setTimeout(r, 200))
    const early = done
    f.release('login')
    await pending
    return { early, path: f.path(), log: [...f.log] }
  })
  expect(result.early).toBe(false)
  expect(result.path).toBe('/login')
  expect(result.log.at(-1)).toBe('/login:ready')
  await expect(page.locator('#app h1')).toHaveText('Login')
})

test('R09: a page without metadata gets the host title back and no stale description', async ({ page }) => {
  await open(page)
  await expect(page).toHaveTitle('Overview')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'About the overview')
  await page.getByRole('link', { name: 'Details' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await expect(page).toHaveTitle('Host title')
  await expect(page.locator('meta[name="description"]')).toHaveCount(0)
})

test('R14 startup: a guard redirect on the initial load rewrites the URL in place', async ({ page }) => {
  await page.goto('./admin')
  await expect(page.locator('#app h1')).toHaveText('Login')
  await expect(page).toHaveURL(/login$/)
  expect(await page.evaluate(() => [.../** @type {any} */ (window).fixture.log])).toEqual(['/login:ready'])
  expect(await page.evaluate(() => navigation.entries().map((e) => new URL(/** @type {string} */ (e.url)).pathname)))
    .not.toContainEqual(expect.stringMatching(/admin$/))
})

test('R14 startup: a guard returning false on the initial load goes to the root', async ({ page, baseURL }) => {
  await page.goto('./denied')
  await expect(page.locator('#app h1')).toHaveText('Overview')
  expect(new URL(page.url()).pathname).toBe(new URL(/** @type {string} */ (baseURL)).pathname)
  expect(await page.evaluate(() => [.../** @type {any} */ (window).fixture.log])).toEqual(['/:ready'])
})

test('R14 retry: retry() reloads a failed route in place, without a new history entry', async ({ page }) => {
  await open(page)
  await page.evaluate(() => /** @type {any} */ (window).fixture.go('/flaky'))
  await expect(page.getByRole('alert')).toHaveText('Flaky failed to load')
  const entries = await page.evaluate(() => navigation.entries().length)
  const result = await page.evaluate(async () => {
    const f = /** @type {any} */ (window).fixture
    f.flags.flakyLoads = true
    await f.retry()
    return { status: f.status(), log: [...f.log] }
  })
  await expect(page.locator('#app h1')).toHaveText('Flaky')
  expect(result.status).toBe('ready')
  expect(result.log.slice(-2)).toEqual(['/flaky:error', '/flaky:ready'])
  expect(await page.evaluate(() => navigation.entries().length)).toBe(entries)
  await expect(page).toHaveURL(/flaky$/)
})

test('R14 teardown: destroy() during a load drops it, and the app starts again', async ({ page }) => {
  await open(page)
  await page.getByRole('link', { name: 'Slow' }).click()
  await expect(page.locator('#app')).toHaveText('Loading…')
  await page.evaluate(() => {
    const f = /** @type {any} */ (window).fixture
    f.destroy()
    f.release('slow')
  })
  await expect(page.locator('#app')).toBeEmpty()
  await expect(page).toHaveTitle('Host title')
  expect(await page.evaluate(() => [.../** @type {any} */ (window).fixture.log])).toEqual(['/:ready'])

  await page.evaluate(() => /** @type {any} */ (window).fixture.start())
  await expect(page.locator('#app h1')).toHaveText('Slow')
  await page.getByRole('link', { name: 'Details' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  expect(await page.evaluate(() => [.../** @type {any} */ (window).fixture.log])).toEqual(['/:ready', '/slow:ready', '/details:ready'])
})

test('without the Navigation API, initRouter() throws the documented message and renders nothing', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'navigation', { value: undefined, configurable: true })
  })
  const error = page.waitForEvent('pageerror')
  await page.goto('./')
  expect((await error).message).toContain(
    'Quiver needs the Navigation API (Chrome/Edge 102+, Safari 26.2+, Firefox 147+). See https://go4cas.github.io/quiver/guide/routing#browser-support',
  )
  await expect(page.locator('#app')).toBeEmpty()
})

test('N160: a page inside a layout aborts its request in onCleanup when left, and on destroy()', async ({ page }) => {
  /** @type {import('@playwright/test').Route[]} */
  const held = []
  await page.route('**/feed.json', (route) => { held.push(route) }) // never answered
  /** @type {string[]} */
  const failed = []
  page.on('requestfailed', (r) => { if (r.url().endsWith('/feed.json')) failed.push(r.failure()?.errorText ?? '') })

  await open(page)
  await page.evaluate(() => /** @type {any} */ (window).fixture.go('/feed'))
  await expect(page.locator('#app [data-layout="shell"] h1')).toHaveText('Feed')
  await expect.poll(() => held.length).toBe(1)

  await page.getByRole('link', { name: 'Details' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await expect.poll(() => failed.length).toBe(1)
  expect(await page.evaluate(() => /** @type {any} */ (window).fixture.cleaned)).toEqual(['feed'])

  await page.evaluate(() => /** @type {any} */ (window).fixture.go('/feed'))
  await expect.poll(() => held.length).toBe(2)
  await page.evaluate(() => /** @type {any} */ (window).fixture.destroy())
  await expect.poll(() => failed.length).toBe(2)
  expect(await page.evaluate(() => /** @type {any} */ (window).fixture.cleaned)).toEqual(['feed', 'feed'])
  await expect(page.locator('#app')).toBeEmpty()
})

test('C-71: a section cancel keeps the page, URL and history; the section ran after global middleware', async ({ page }) => {
  await open(page)
  await page.getByRole('link', { name: 'Details' }).click()
  await expect(page.locator('#app h1')).toHaveText('Details')
  await page.evaluate(() => {
    const fixture = /** @type {any} */ (window).fixture
    fixture.flags.vault = 'locked'
    fixture.ran.length = 0
  })
  await page.getByRole('link', { name: 'Vault item' }).click()
  await expect(page).toHaveURL(/details$/)
  await expect(page.locator('#app h1')).toHaveText('Details')
  expect(await page.evaluate(() => /** @type {any} */ (window).fixture.ran)).toEqual(['global:/vault/7', 'root:/vault/7', 'vault:/vault/7'])

  await page.goBack()
  await expect(page.locator('#app h1')).toHaveText('Overview')
})

test('C-71: a section redirect replaces the entry, and await go() waits for the target', async ({ page, baseURL }) => {
  await open(page)
  const result = await page.evaluate(async () => {
    const fixture = /** @type {any} */ (window).fixture
    fixture.flags.vault = 'login'
    fixture.log.length = 0
    await fixture.go('/vault/7')
    return { path: fixture.path(), log: [...fixture.log] }
  })
  expect(result).toEqual({ path: '/login', log: ['/login:ready'] })
  await expect(page).toHaveURL(/login$/)
  await expect(page.locator('#app h1')).toHaveText('Login')
  expect(await stack(page, baseURL)).toEqual({ urls: ['/', '/login'], index: 1 })
  await page.goBack()
  await expect(page.locator('#app h1')).toHaveText('Overview')
})

test('C-71: a section redirect on the initial load rewrites the URL in place', async ({ page }) => {
  await page.goto('vault/3?vault=login')
  await expect(page.locator('#app h1')).toHaveText('Login')
  await expect(page).toHaveURL(/login$/)
  expect(await page.evaluate(() => /** @type {any} */ (window).fixture.ran)).toEqual(['global:/vault/3', 'root:/vault/3', 'vault:/vault/3', 'global:/login', 'root:/login'])
})

test('C-71: a not-found path runs global middleware only', async ({ page }) => {
  await open(page)
  const ran = await page.evaluate(async () => {
    const fixture = /** @type {any} */ (window).fixture
    fixture.ran.length = 0
    await fixture.go('/vault-nowhere/deep')
    return [...fixture.ran]
  })
  expect(ran).toEqual(['global:/vault-nowhere/deep'])
  await expect(page.getByRole('alert')).toHaveText('No route matches "/vault-nowhere/deep".')
})

test('S32-02: a guard redirect is checked as the browser parses it, after mount and on startup', async ({ page, baseURL }) => {
  const origin = new URL(/** @type {string} */ (baseURL)).origin
  await open(page)
  const basePath = new URL(/** @type {string} */ (baseURL)).pathname
  // Under a sub-path base, '\t//evil.example/x' and '/\evil.example/x' become '<base>/evil.example/x'-like paths:
  // a path inside the app (not found), never another host.
  for (const target of ['/\\evil.example/x', '\t//evil.example/x', '//evil.example/x', 'https://evil.example/']) {
    await page.evaluate(async (t) => {
      const f = /** @type {any} */ (window).fixture
      f.flags.bounce = t
      await f.go('/bounce')
    }, target)
    await expect(page.getByRole('alert')).toBeVisible()
    expect(new URL(page.url()).origin).toBe(origin)
    expect(new URL(page.url()).pathname.startsWith(basePath)).toBe(true)
    if (basePath === '/' || target.startsWith('//') || target.startsWith('https:')) {
      await expect(page.getByRole('alert')).toContainText('Redirects must be base-relative paths inside the app')
    }
    await page.getByRole('link', { name: 'Overview' }).click()
    await expect(page.locator('#app h1')).toHaveText('Overview')
  }

  await page.evaluate(async () => {
    const f = /** @type {any} */ (window).fixture
    f.flags.bounce = 'details?from=bounce#top'
    await f.go('/bounce')
  })
  await expect(page.locator('#app h1')).toHaveText('Details')
  expect(new URL(page.url()).pathname).toBe(new URL('details', /** @type {string} */ (baseURL)).pathname)
  expect(new URL(page.url()).search + new URL(page.url()).hash).toBe('?from=bounce#top')

  await page.goto(`bounce?bounce=${encodeURIComponent('//evil.example/')}`)
  await expect(page.getByRole('alert')).toContainText('Redirects must be base-relative paths inside the app')
  expect(new URL(page.url()).origin).toBe(origin)
  await expect(page).toHaveURL(/bounce\?bounce=/)
})
