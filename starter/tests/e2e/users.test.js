import { test, expect } from '@playwright/test'

test('shows all three seed members', async ({ page }) => {
  await page.goto('/users')
  await expect(page.locator('main').getByText('Alice Nkosi')).toBeVisible()
  await expect(page.locator('main').getByText('Bob Jacobs')).toBeVisible()
  await expect(page.locator('main').getByText('Charlie Adams')).toBeVisible()
})

test('member count badge reflects seed data', async ({ page }) => {
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: /Team\s+3/ })).toBeVisible()
})

test('add member increases count and shows new card', async ({ page }) => {
  await page.goto('/users')
  await page.getByRole('button', { name: 'Add member' }).click()
  await expect(page.getByRole('heading', { name: /Team\s+4/ })).toBeVisible()
  await expect(page.getByText('New Member')).toBeVisible()
})

test('remove member decreases count', async ({ page }) => {
  await page.goto('/users')
  await page.locator('article').filter({ hasText: 'Charlie Adams' }).getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByRole('heading', { name: /Team\s+2/ })).toBeVisible()
  await expect(page.getByText('Charlie Adams')).not.toBeVisible()
})

test('view profile navigates to user detail page', async ({ page }) => {
  await page.goto('/users')
  await page.locator('article').filter({ hasText: 'Alice Nkosi' }).getByRole('button', { name: 'View profile' }).click()
  await expect(page.url()).toMatch(/\/users\/[^/]+$/)
  // Reactive title via useMeta — includes the user's name from state.
  await expect(page).toHaveTitle('Alice Nkosi — Profile')
  await expect(page.getByRole('heading', { name: 'Alice Nkosi' })).toBeVisible()
})

test('user detail shows role, team, and status', async ({ page }) => {
  await page.goto('/users')
  await page.locator('article').filter({ hasText: 'Alice Nkosi' }).getByRole('button', { name: 'View profile' }).click()
  await expect(page.getByText('Support Agent')).toBeVisible()
  await expect(page.getByText('Customer Care')).toBeVisible()
  await expect(page.getByText('online')).toBeVisible()
})

test('back to team button returns to team list', async ({ page }) => {
  await page.goto('/users')
  await page.locator('article').filter({ hasText: 'Alice Nkosi' }).getByRole('button', { name: 'View profile' }).click()
  await page.getByRole('button', { name: '← Back to team' }).click()
  await expect(page).toHaveURL('/users')
})

test('unknown user id shows not found message', async ({ page }) => {
  await page.goto('/users/does-not-exist')
  await expect(page).toHaveTitle('Profile')
  await expect(page.getByText('User not found')).toBeVisible()
  await expect(page.getByText(/No user exists for ID/)).toBeVisible()
})
