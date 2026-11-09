// The screenshot states from planning/v3/DESIGN.md §8.1.
// Each state is captured in 5 themes × 2 modes; `mobile` states also at 390×844.

/** @typedef {import('@playwright/test').Page} Page */
/** @typedef {import('@playwright/test').Locator} Locator */

/**
 * @typedef {object} State
 * @property {string} name                       folder name under __screenshots__/<project>/
 * @property {string} path                       URL to open
 * @property {boolean} mobile                    also captured in the visual-mobile project
 * @property {(page: Page) => Promise<void>} ready  reaches the state and waits for it
 * @property {(page: Page) => Locator[]} [mask]  regions that change per run
 */

/** @param {Page} page @param {string} name */
const heading = (page, name) => page.getByRole('heading', { level: 1, name }).waitFor()

/** @type {State[]} */
export const STATES = [
  {
    name: 'dashboard',
    path: '/',
    mobile: true,
    ready: (page) => heading(page, 'Dashboard'),
  },
  {
    name: 'dashboard-user-menu',
    path: '/',
    mobile: false,
    ready: async (page) => {
      await heading(page, 'Dashboard')
      await page.getByTestId('user-menu').locator('summary').click()
      await page.getByRole('button', { name: 'Sign out' }).waitFor()
    },
  },
  {
    name: 'team',
    path: '/users',
    mobile: true,
    ready: (page) => heading(page, /^Team/),
  },
  {
    name: 'profile',
    path: '/users',
    mobile: true,
    ready: async (page) => {
      await heading(page, /^Team/)
      await page.getByRole('button', { name: 'View profile' }).first().click()
      await page.getByRole('heading', { level: 2, name: 'Alice Nkosi' }).waitFor()
    },
    // User ids are crypto.randomUUID(): mask the header path and the :id tile
    // (the whole tile, because retro's glow on the value spills past the <dd>).
    mask: (page) => [page.locator('header > span').first(), page.locator('dd').nth(2).locator('..')],
  },
  {
    name: 'profile-not-found',
    path: '/users/missing',
    mobile: false,
    ready: (page) => page.getByRole('heading', { level: 2, name: 'User not found' }).waitFor(),
  },
  {
    name: 'posts',
    path: '/posts',
    mobile: true,
    ready: async (page) => {
      await heading(page, 'Posts')
      await page.getByText('Success — 12 posts loaded').waitFor()
    },
  },
  {
    name: 'posts-error',
    path: '/posts',
    mobile: false,
    ready: async (page) => {
      await page.getByText('Success — 12 posts loaded').waitFor()
      await page.getByRole('button', { name: 'Force error' }).click()
      await page.getByText('HTTP 404', { exact: true }).first().waitFor()
    },
  },
  {
    name: 'toasts',
    path: '/toasts',
    mobile: true,
    ready: (page) => heading(page, 'Toasts'),
  },
  {
    name: 'toasts-shown',
    path: '/toasts',
    mobile: false,
    ready: async (page) => {
      await heading(page, 'Toasts')
      await page.getByRole('spinbutton').fill('0')
      for (const type of ['Success', 'Error', 'Warning', 'Info']) {
        await page.getByRole('button', { name: type, exact: true }).click()
      }
      await page.getByText('4 active').waitFor()
    },
  },
  {
    name: 'login',
    path: '/login',
    mobile: true,
    ready: (page) => heading(page, 'Sign in'),
  },
  {
    name: 'login-errors',
    path: '/login',
    mobile: false,
    ready: async (page) => {
      await heading(page, 'Sign in')
      await page.getByRole('button', { name: 'Sign in' }).click()
      await page.getByText('Password is required.').waitFor()
    },
  },
  {
    name: 'not-found',
    path: '/does-not-exist',
    mobile: true,
    ready: (page) => heading(page, 'Page not found'),
  },
]
