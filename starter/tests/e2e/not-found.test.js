import { test, expect } from '@playwright/test'

test('unknown route renders 404 page with correct title', async ({ page }) => {
  await page.goto('/this/does/not/exist')
  await expect(page).toHaveTitle('404 – Not Found')
  await expect(page.getByText('404')).toBeVisible()
  await expect(page.getByText('Page not found')).toBeVisible()
  await expect(page.getByText('The requested route does not exist.')).toBeVisible()
})

test('back to dashboard button returns to root', async ({ page }) => {
  await page.goto('/does-not-exist')
  await page.getByRole('button', { name: 'Back to dashboard' }).click()
  await expect(page).toHaveURL('/')
  await expect(page).toHaveTitle('Dashboard')
})
