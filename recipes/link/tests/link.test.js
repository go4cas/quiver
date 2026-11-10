import { describe, it, expect } from 'vitest'
import { html } from '@arrow-js/core'
import { Link } from '../link.js'

describe('Link', () => {
  it('renders a plain anchor with the base-aware href, class and children, and no click handler', () => {
    const el = document.createElement('div')
    html`${Link({ to: '/users', children: 'Team', class: 'nav' })}`(el)
    const a = /** @type {HTMLAnchorElement} */ (el.querySelector('a'))
    expect(a.getAttribute('href')).toBe('/users')
    expect(a.className).toBe('nav')
    expect(a.textContent).toBe('Team')
    expect(a.hasAttribute('aria-current')).toBe(false)
    expect(a.outerHTML).not.toContain('@click')
  })
})
