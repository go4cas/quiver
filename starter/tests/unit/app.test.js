import { describe, it, expect } from 'vitest'
import app from 'quiver:app'

// The app the quiver() Vite plugin builds from src/ (vitest.config.js).
describe('quiver:app', () => {
  it('has the layouts in src/layouts/', () => {
    expect(Object.keys(app.layouts).sort()).toEqual(['default', 'menu'])
  })

  it('has both views from src/views/', () => {
    expect(typeof app.views.loading).toBe('function')
    expect(typeof app.views.error).toBe('function')
  })

  it('builds the sidebar from each page meta.nav, in order', () => {
    expect(app.nav).toEqual([
      { to: '/', label: 'Dashboard' },
      { to: '/users', label: 'Team' },
      { to: '/posts', label: 'Posts' },
      { to: '/toasts', label: 'Toasts' },
    ])
  })

  it('provides app and currentUser from app.config.js, and no nav override', () => {
    expect(Object.keys(app.config).sort()).toEqual(['app', 'currentUser'])
  })

  it('has the same routes as quiver:routes and no middleware', () => {
    expect(Object.keys(app.routes)).toEqual(['/', '/login', '/posts', '/toasts', '/users', '/users/:id'])
    expect(app.middleware).toEqual({ global: [], sections: {} })
  })
})
