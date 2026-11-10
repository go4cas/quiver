import { test, expect } from '@playwright/test'

test('dashboard metric cards show correct seed counts', async ({ page }) => {
  await page.goto('/')

  // 3 seed users — 1 online (Alice), 1 away (Bob), 1 offline (Charlie)
  const cards = page.getByTestId('metric-card')
  await expect(cards.filter({ hasText: 'Team members' }).getByRole('paragraph').nth(1)).toContainText('3')
  await expect(cards.filter({ hasText: 'Online' }).getByRole('paragraph').nth(1)).toContainText('1')
  await expect(cards.filter({ hasText: 'Away' }).getByRole('paragraph').nth(1)).toContainText('1')
})

test('adding a member on the team page is reflected in dashboard metrics', async ({ page }) => {
  await page.goto('/users')
  await page.getByRole('button', { name: 'Add member' }).click()
  await expect(page.getByRole('heading', { name: /Team\s+4/ })).toBeVisible()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page).toHaveURL('/')

  const teamCard = page.getByTestId('metric-card').filter({ hasText: 'Team members' })
  await expect(teamCard.getByRole('paragraph').nth(1)).toContainText('4')
})
