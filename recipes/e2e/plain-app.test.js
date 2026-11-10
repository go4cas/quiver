import { test, expect } from '@playwright/test'

// SPEC P7 Done-when, the part CI can repeat: the toasts recipe gives a plain
// Arrow app (not the starter, no Quiver router, no bundler) a working toast.
// The live `/add-component toast` run is recorded in the P7 PR.

/** @param {import('@playwright/test').Page} page */
async function open(page) {
  /** @type {string[]} */
  const requests = []
  page.on('request', (r) => requests.push(new URL(r.url()).pathname))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Plain Arrow app' })).toBeVisible()
  return requests
}

test('a success toast shows with the theme tokens and closes by itself', async ({ page }) => {
  const requests = await open(page)
  await page.getByRole('button', { name: 'Save' }).click()
  const toast = page.getByRole('alert')
  await expect(toast).toHaveText(/Saved\./)
  await expect(toast).toHaveAttribute('data-type', 'success')

  // tokens.css loaded: the toast takes --q-color-success-tint, not a transparent default.
  const { background, tint } = await toast.evaluate((el) => {
    const probe = document.createElement('div')
    probe.style.backgroundColor = 'var(--q-color-success-tint)'
    document.body.append(probe)
    const tint = getComputedStyle(probe).backgroundColor
    probe.remove()
    return { background: getComputedStyle(el).backgroundColor, tint }
  })
  expect(background).toBe(tint)
  expect(background).not.toBe('rgba(0, 0, 0, 0)')

  await expect(toast).toHaveCount(0, { timeout: 6000 }) // 4000 ms default + exit animation
  expect(requests.some((p) => p.includes('@go4cas/quiver'))).toBe(false)
})

test('the dismiss button closes a permanent toast after its exit animation', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Fail' }).click()
  const toast = page.getByRole('alert')
  await expect(toast).toHaveAttribute('data-type', 'error')
  await toast.getByRole('button', { name: 'Dismiss' }).click()
  await expect(toast).toHaveAttribute('data-state', 'closing')
  await expect(toast).toHaveCount(0)
})

test('with reduced motion, a dismissed toast goes at once (D31)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  await page.getByRole('button', { name: 'Fail' }).click()
  const toast = page.getByRole('alert')
  await expect(toast).toBeVisible()
  const animations = await toast.evaluate((el) => el.getAnimations().length)
  expect(animations).toBe(0)
  await toast.getByRole('button', { name: 'Dismiss' }).click()
  await expect(toast).toHaveCount(0, { timeout: 500 })
})
