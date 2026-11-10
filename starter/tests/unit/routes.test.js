import { describe, it, expect } from 'vitest'
import { fileToRoutePath, routes, notFound } from '../../src/routes.js'

describe('fileToRoutePath', () => {
  it('converts index.js to root', () => {
    expect(fileToRoutePath('./pages/index.js')).toBe('/')
  })

  it('converts a top-level page', () => {
    expect(fileToRoutePath('./pages/about.js')).toBe('/about')
  })

  it('converts a nested index to the directory path', () => {
    expect(fileToRoutePath('./pages/users/index.js')).toBe('/users')
  })

  it('converts a dynamic segment', () => {
    expect(fileToRoutePath('./pages/users/[id].js')).toBe('/users/:id')
  })

  it('converts a nested dynamic segment', () => {
    expect(fileToRoutePath('./pages/blog/[slug]/comments.js')).toBe('/blog/:slug/comments')
  })
})

describe('route manifest', () => {
  it('has one pattern per page and leaves not-found.js out', () => {
    expect(Object.keys(routes).sort()).toEqual(['/', '/login', '/posts', '/toasts', '/users', '/users/:id'])
  })

  it('exports the top-level not-found page as notFound', () => {
    expect(typeof notFound).toBe('function')
  })
})
