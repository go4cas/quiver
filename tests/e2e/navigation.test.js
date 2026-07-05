import { test, expect } from '@playwright/test'

test('dashboard loads with correct title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('team nav link navigates to team page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Team' }).click()
  await expect(page).toHaveURL('/users')
  await expect(page).toHaveTitle('Team')
  await expect(page.getByRole('heading', { name: /Team\s+\d/ })).toBeVisible()
})

test('sign out from user menu navigates to login page', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-testid="user-menu"] summary').click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/login')
  await expect(page).toHaveTitle('Sign In')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('active nav link has aria-current="page" and inactive links have no aria-current at all', async ({ page }) => {
  await page.goto('/users')
  const teamLink = page.getByRole('link', { name: 'Team' })
  await expect(teamLink).toHaveAttribute('aria-current', 'page')
  const dashboardLink = page.getByRole('link', { name: 'Dashboard' })
  // Attribute must be absent, not just ≠ "page" — a stringified "undefined"
  // would be treated as aria-current="true" by assistive tech.
  await expect(dashboardLink).not.toHaveAttribute('aria-current')

  await page.goto('/')
  await expect(dashboardLink).toHaveAttribute('aria-current', 'page')
  await expect(teamLink).not.toHaveAttribute('aria-current')
})

test('deeper path activates the parent nav link', async ({ page }) => {
  await page.goto('/users')
  await page.locator('article').first().getByRole('button', { name: 'View profile' }).click()
  await expect(page.getByRole('link', { name: 'Team' })).toHaveAttribute('aria-current', 'page')
})
