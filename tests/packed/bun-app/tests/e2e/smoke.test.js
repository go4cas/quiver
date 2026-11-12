import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// R32-12: the conventions app built by a real Bun.build with splitting, at /
// and under /sub/app/. URLs stay relative (CI-3).

test('renders the page in its layout with the navigation from meta.nav', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('layout')).toHaveText('Packed Bun app')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  const links = page.getByRole('navigation').getByRole('link')
  await expect(links).toHaveText(['Home', 'About'])
  await expect(page).toHaveTitle('Home')
})

test('a page loads as its own chunk when first visited, in-app', async ({ page }) => {
  /** @type {string[]} */
  const scripts = []
  page.on('request', (request) => { if (request.resourceType() === 'script') scripts.push(request.url()) })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  const before = scripts.length
  await page.evaluate(() => { /** @type {any} */ (window).__marker = 1 })
  await page.getByRole('link', { name: 'About' }).click()
  await expect(page).toHaveURL('about')
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()
  expect(scripts.length).toBeGreaterThan(before)
  expect(await page.evaluate(() => /** @type {any} */ (window).__marker)).toBe(1)
})

test('the section guard in pages/private/_middleware.js redirects, on load and in-app', async ({ page }) => {
  await page.goto('private')
  await expect(page).toHaveURL('login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.goto('./')
  await page.evaluate(() => /** @type {any} */ (window).navigation.navigate('private'))
  await expect(page).toHaveURL('login')
})

test('an unknown path renders not-found', async ({ page }) => {
  await page.goto('nowhere')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('a broken source folder fails the Bun build with the scanner’s diagnostic', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'root', 'one build is enough')
  const app = join(testInfo.config.rootDir, '..', '..')
  const src = join(mkdtempSync(join(tmpdir(), 'quiver-bun-broken-')), 'src')
  cpSync(join(app, 'src'), src, { recursive: true })
  mkdirSync(join(src, 'pages', '[id]'))
  mkdirSync(join(src, 'pages', '[slug]'))
  for (const [dir, page] of [['[id]', 'a.js'], ['[slug]', 'b.js']]) {
    writeFileSync(join(src, 'pages', dir, page), "export default () => ''\n")
    writeFileSync(join(src, 'pages', dir, '_middleware.js'), 'export default () => {}\n')
  }
  const result = spawnSync('bun', ['build.js'], {
    cwd: app,
    env: { ...process.env, QUIVER_SRC: src, QUIVER_OUT: join(src, '..', 'dist') },
    encoding: 'utf8',
  })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('[quiver] [id]/_middleware.js and [slug]/_middleware.js differ only in parameter names')
})
