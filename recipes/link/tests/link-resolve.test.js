import { describe, it, expect, afterEach, vi } from 'vitest'
import { html, reactive, nextTick } from '@arrow-js/core'

// The base and the current path are set per test through this mock, the way
// initRouter() and navigations set them in core (audit S32-02, R32-07, N220).
const state = reactive({ base: '/', path: '/' })

vi.mock('@go4cas/quiver', () => ({
  url: (/** @type {string} */ path) =>
    /^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')
      ? path
      : state.base + (path.startsWith('/') ? path.slice(1) : path),
  useRoute: () => ({ path: () => state.path }),
}))

const { Link, linkHref, resolveLink, activeState } = await import('../Link.js')

/** @param {string} href */
function withBaseElement(href) {
  const el = document.createElement('base')
  el.href = href
  document.head.append(el)
  return el
}

/**
 * @param {string | null} href
 * @param {string} base
 * @param {boolean} refused whether this base must refuse it outright
 */
function expectInsideOrRefused(href, base, refused) {
  if (refused) return expect(href).toBeNull()
  if (href === null) return
  const dest = new URL(/** @type {string} */ (href), document.baseURI)
  expect(dest.origin).toBe(window.location.origin)
  expect(dest.pathname.startsWith(base)).toBe(true)
}

afterEach(() => {
  state.base = '/'
  state.path = '/'
  document.querySelectorAll('base').forEach((el) => el.remove())
})

describe('Link checks the URL the browser resolves (audit S32-02)', () => {
  // Each of these passes a string check but resolves to another origin once the
  // base is prefixed and the browser drops tabs and newlines and reads `\` as `/`.
  const offOrigin = ['\\evil.example', '\t/evil.example', '\n/evil.example', '/\t/evil.example', '\\\t\\evil.example']

  for (const base of ['/', '/sub/app/']) {
    describe(`base ${base}`, () => {
      // At the root these become `//evil.example`; under a sub-path they stay
      // inside the app (`/sub/app//evil.example`). Either way no href leaves it.
      it.each(offOrigin)('never resolves %j outside the app', (to) => {
        state.base = base
        expectInsideOrRefused(linkHref(to), base, base === '/')
      })

      it.each(offOrigin)('never resolves %j outside the app with a <base> element', (to) => {
        state.base = base
        withBaseElement(base)
        expectInsideOrRefused(linkHref(to), base, base === '/')
      })

      it('allows paths inside the base, with query and hash, and external URLs', () => {
        state.base = base
        withBaseElement(base)
        expect(linkHref('/users')).toBe(`${base}users`)
        expect(linkHref('users?tab=1#top')).toBe(`${base}users?tab=1#top`)
        expect(linkHref('/')).toBe(base)
        expect(linkHref('https://example.com/a')).toBe('https://example.com/a')
        expect(linkHref('mailto:ada@example.com')).toBe('mailto:ada@example.com')
      })
    })
  }

  it('refuses a path that climbs out of the base', () => {
    state.base = '/sub/app/'
    expect(linkHref('/../other')).toBeNull()
    expect(linkHref('../../x')).toBeNull()
  })

  it('refuses a scheme the parser sees after stripping control characters', () => {
    expect(linkHref('\u0000\tjava\nscript:alert(1)')).toBeNull()
  })

  it('treats an external URL as never active', () => {
    expect(resolveLink('https://example.com/')?.segments).toBeNull()
  })
})

describe('Link active state (audit R32-07)', () => {
  it.each([
    ['/release notes', '/release%20notes'],
    ['/release%20notes', '/release notes'],
    ['/café', '/caf%C3%A9'],
    ['/café', '/caf%C3%A9'],
    ['/users?tab=2#top', '/users'],
    ['/users/', '/users'],
  ])('%s is the current page at %s', (to, path) => {
    const target = resolveLink(to)
    expect(target && target.segments && activeState(target.segments, path)).toBe('page')
  })

  it('marks a section above the current page, never /, and not a sibling', () => {
    const seg = (/** @type {string} */ to) => /** @type {string[]} */ (resolveLink(to)?.segments)
    expect(activeState(seg('/users'), '/users/42')).toBe('section')
    expect(activeState(seg('/'), '/users')).toBeNull()
    expect(activeState(seg('/'), '/')).toBe('page')
    expect(activeState(seg('/user'), '/users')).toBeNull()
    expect(activeState(seg('/users/42'), '/users')).toBeNull()
  })

  it('works under a sub-path base', () => {
    state.base = '/sub/app/'
    const target = resolveLink('/release notes')
    expect(target?.segments).toEqual(['release notes'])
  })

  it('renders aria-current only on an exact match and data-active on a section', async () => {
    const el = document.createElement('div')
    html`${Link({ to: '/release notes', children: 'Notes' })}${Link({ to: '/users', children: 'Team' })}`(el)
    const [notes, team] = /** @type {HTMLAnchorElement[]} */ ([...el.querySelectorAll('a')])

    state.path = '/release%20notes'
    await nextTick()
    expect(notes.getAttribute('aria-current')).toBe('page')
    expect(notes.getAttribute('data-active')).toBe('page')
    expect(team.hasAttribute('aria-current')).toBe(false)
    expect(team.hasAttribute('data-active')).toBe(false)

    state.path = '/users/42'
    await nextTick()
    expect(notes.hasAttribute('aria-current')).toBe(false)
    expect(team.hasAttribute('aria-current')).toBe(false)
    expect(team.getAttribute('data-active')).toBe('section')

    state.path = '/users'
    await nextTick()
    expect(team.getAttribute('aria-current')).toBe('page')
  })
})
