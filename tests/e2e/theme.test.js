import { test, expect } from '@playwright/test'

// ── Light / dark mode ─────────────────────────────────────────────────────────

test('theme toggle switches between light and dark mode', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')

  const initialMode = await html.getAttribute('data-mode')
  await page.getByRole('button', { name: /toggle light|toggle dark|toggle/i }).click()
  const newMode = await html.getAttribute('data-mode')

  expect(newMode).not.toBe(initialMode)
  expect(['light', 'dark']).toContain(newMode)
})

test('toggling twice returns to the original mode', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')

  const initialMode = await html.getAttribute('data-mode')
  const btn = page.getByRole('button', { name: /toggle light|toggle dark|toggle/i })
  await btn.click()
  await btn.click()

  expect(await html.getAttribute('data-mode')).toBe(initialMode)
})

// ── Theme selection ───────────────────────────────────────────────────────────

test('selecting Monochrome applies data-theme="mono"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Monochrome' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mono')
})

test('selecting Liquid Glass applies data-theme="glass"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Liquid Glass' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'glass')
})

test('selecting Retro / Y2K applies data-theme="retro"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Retro / Y2K' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'retro')
})

test('selecting Neo Brutalism applies data-theme="brutalist"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Neo Brutalism' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'brutalist')
})

// ── Persistence ───────────────────────────────────────────────────────────────

test('selected theme persists across page reloads', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Neo Brutalism' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'brutalist')
})

test('dark/light mode persists across page reloads', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')

  const initialMode = await html.getAttribute('data-mode')
  await page.getByRole('button', { name: /toggle light|toggle dark|toggle/i }).click()
  const newMode = await html.getAttribute('data-mode')
  expect(newMode).not.toBe(initialMode)

  await page.reload()
  await expect(html).toHaveAttribute('data-mode', newMode)
})
