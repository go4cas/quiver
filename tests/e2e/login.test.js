import { test, expect } from '@playwright/test'

test('login page renders correctly', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveTitle('Sign In')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('empty submit shows required field errors', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Email is required.')).toBeVisible()
  await expect(page.getByText('Password is required.')).toBeVisible()
})

test('invalid email format shows validation error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('notanemail')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Please enter a valid email address.')).toBeVisible()
})

test('unknown email shows not found error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('unknown@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('No account found for this email.')).toBeVisible()
})

test('known email shows loading state then redirects to dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('alice@example.com')
  await page.getByLabel('Password').fill('any-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  const submitBtn = page.getByRole('button', { name: 'Signing in…' })
  await expect(submitBtn).toBeVisible()
  await expect(submitBtn).toHaveAttribute('aria-disabled', 'true')
  await expect(page).toHaveURL('/')
  await expect(page).toHaveTitle('Dashboard')
})
