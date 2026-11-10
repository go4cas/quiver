import { test, expect } from '@playwright/test'

// Smoke test (TECH-SPEC CI-5). Runs at / and under /sub/app/, so URLs stay relative (CI-3).

test('renders the home page in the layout', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(3)
  await expect(page).toHaveTitle('Home')
})

test('links carry the base and navigate in-app', async ({ page, baseURL }) => {
  await page.goto('./')
  await page.evaluate(() => { /** @type {any} */ (window).__marker = 1 })
  const link = page.getByRole('link', { name: 'Ada' })
  expect(new URL(/** @type {string} */ (await link.getAttribute('href')), baseURL).href).toBe(new URL('users/1', baseURL).href)
  await link.click()
  await expect(page).toHaveURL('users/1')
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible()
  await page.getByRole('link', { name: 'About' }).click()
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible()
  // No document load happened: the router intercepted every navigation.
  expect(await page.evaluate(() => /** @type {any} */ (window).__marker)).toBe(1)
})

test('a deep link renders its route with params', async ({ page }) => {
  await page.goto('users/2')
  await expect(page.getByRole('heading', { name: 'Alan Turing' })).toBeVisible()
  await expect(page).toHaveTitle('Alan Turing')
})

test('an unknown path renders not-found', async ({ page }) => {
  await page.goto('nowhere')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expect(page.getByText('/nowhere')).toBeVisible()
})
