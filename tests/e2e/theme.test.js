import { test, expect } from '@playwright/test'

test('theme toggle switches between light and dark mode', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')

  // App starts in a known theme; toggle should flip it
  const initialTheme = await html.getAttribute('data-theme')
  await page.getByRole('button', { name: /toggle|theme/i }).first().click()
  const newTheme = await html.getAttribute('data-theme')

  expect(newTheme).not.toBe(initialTheme)
  expect(['light', 'dark']).toContain(newTheme)
})

test('toggling twice returns to the original theme', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')

  const initialTheme = await html.getAttribute('data-theme')
  const btn = page.getByRole('button', { name: /toggle|theme/i }).first()
  await btn.click()
  await btn.click()

  expect(await html.getAttribute('data-theme')).toBe(initialTheme)
})
