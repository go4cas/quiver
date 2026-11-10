import { describe, it, expect } from 'vitest'
import routes, { notFound } from 'quiver:routes'

// The manifest the quiver() Vite plugin builds from src/pages/ (vitest.config.js).
describe('route manifest', () => {
  it('has one pattern per page and leaves not-found.js out', () => {
    expect(Object.keys(routes)).toEqual(['/', '/login', '/posts', '/toasts', '/users', '/users/:id'])
  })

  it('loads each page module', async () => {
    for (const load of Object.values(routes)) {
      expect(typeof (await load()).default).toBe('function')
    }
  })

  it('exports the top-level not-found page as notFound', async () => {
    expect(typeof notFound).toBe('function')
    expect(typeof (await /** @type {NonNullable<typeof notFound>} */ (notFound)()).default).toBe('function')
  })
})
