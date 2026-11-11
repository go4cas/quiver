import { describe, it, expect, vi } from 'vitest'
import { html } from '@arrow-js/core'
import { Link, linkHref } from '../link.js'

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

describe('Link href policy (audit S04, N144)', () => {
  it.each([
    ['/users', '/users'],
    ['users?tab=1#top', '/users?tab=1#top'],
    ['https://example.com/a', 'https://example.com/a'],
    ['HTTP://example.com', 'HTTP://example.com'],
    ['mailto:ada@example.com', 'mailto:ada@example.com'],
    ['tel:+27123456789', 'tel:+27123456789'],
  ])('allows %s', (to, href) => {
    expect(linkHref(to)).toBe(href)
  })

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    '\u0001javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '//evil.example',
    '\\\\evil.example',
    '/\\evil.example',
  ])('refuses %j', (to) => {
    expect(linkHref(to)).toBeNull()
  })

  it('renders a refused target without an href and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = document.createElement('div')
    html`${Link({ to: 'javascript:alert(1)', children: 'x' })}`(el)
    const a = /** @type {HTMLAnchorElement} */ (el.querySelector('a'))
    expect(a.hasAttribute('href')).toBe(false)
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
