import { test, expect } from '@playwright/test'

// The toasts recipe in the starter (src/quiver/toasts/). Exit timing follows the
// CSS animation (D31), so the tests wait on the DOM, never on a fixed delay.

test('a toast shows, and its dismiss button removes it after the exit animation', async ({ page }) => {
  await page.goto('toasts')
  await page.getByRole('button', { name: 'Success', exact: true }).click()
  const toast = page.getByRole('alert').filter({ hasText: 'Changes saved successfully.' })
  await expect(toast).toBeVisible()
  await expect(toast).toHaveAttribute('data-type', 'success')
  await expect(page.getByText('1 active')).toBeVisible()

  await toast.getByRole('button', { name: 'Dismiss' }).click()
  await expect(toast).toHaveCount(0)
  await expect(page.getByText('none active')).toBeVisible()
})

test('a timed toast closes by itself', async ({ page }) => {
  await page.goto('toasts')
  await page.getByLabel('Duration (ms · 0 = permanent)').fill('500')
  await page.getByRole('button', { name: 'Info', exact: true }).click()
  const toast = page.getByRole('alert').filter({ hasText: 'A new version is available.' })
  await expect(toast).toBeVisible()
  await expect(toast).toHaveCount(0)
})

test('toasts still render after a non-dismissible one has gone (N99)', async ({ page }) => {
  await page.goto('toasts')
  await page.getByLabel('Duration (ms · 0 = permanent)').fill('500')
  await page.getByText('Dismissible').click()
  await page.getByRole('button', { name: 'Warning', exact: true }).click()
  const sticky = page.getByRole('alert').filter({ hasText: 'Your session expires in 5 minutes.' })
  await expect(sticky).toBeVisible()
  await expect(sticky.getByRole('button', { name: 'Dismiss' })).toHaveCount(0)
  await expect(sticky).toHaveCount(0)

  await page.getByText('Dismissible').click()
  await page.getByRole('button', { name: 'Error', exact: true }).click()
  const next = page.getByRole('alert').filter({ hasText: 'Something went wrong. Please try again.' })
  await expect(next).toBeVisible()
  await expect(next.getByRole('button', { name: 'Dismiss' })).toBeVisible()
})
