import { describe, it, expect, afterEach } from 'vitest'
import { html } from '@arrow-js/core'
import { provide, destroy } from '@go4cas/quiver'
import BasicLayout from '../default.js'
import MenuLayout from '../menu.js'

afterEach(() => {
  destroy() // clears the provide() context
  document.body.innerHTML = ''
})

/** @param {import('@arrow-js/core').ArrowRenderable} template */
function render(template) {
  const el = document.createElement('div')
  document.body.append(el)
  html`${template}`(el)
  return el
}

describe('layouts', () => {
  it('BasicLayout wraps the page in a panel and mounts the toast container', () => {
    const el = render(BasicLayout(html`<p>page</p>`))
    expect(el.querySelector('.q-basic__card.q-panel')?.textContent?.trim()).toBe('page')
    expect(el.querySelector('.q-toasts')).not.toBeNull()
  })
})

describe('MenuLayout', () => {
  it('renders the provided app, nav and user, plus the theme controls', () => {
    provide('app', { name: 'Acme', tagline: 'Tools', logo: '/logo.svg', footer: 'v1' })
    provide('nav', [{ to: '/', label: 'Home' }, { to: '/reports', label: 'Reports' }])
    provide('currentUser', { name: 'Ada', email: 'ada@example.com', avatar: '/ada.svg' })
    const el = render(MenuLayout(html`<p>page</p>`))

    expect(el.querySelector('img.q-menu__logo')?.getAttribute('src')).toBe('/logo.svg')
    expect(el.querySelector('.q-menu__tagline')?.textContent).toBe('Tools')
    const links = [...el.querySelectorAll('.q-menu__nav a.q-menu__nav-link')]
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['Home', '/'], ['Reports', '/reports']])
    expect(el.querySelector('.q-menu__footer')?.textContent).toBe('v1')
    expect(el.querySelector('.q-user-menu__email')?.textContent).toBe('ada@example.com')
    expect(el.querySelector('.q-theme-select')).not.toBeNull()
    expect(el.querySelector('.q-mode-toggle')).not.toBeNull()
    expect(el.querySelector('.q-menu__content')?.textContent).toBe('page')
    expect(el.querySelector('.q-toasts')).not.toBeNull()
  })

  it('without a logo or footer, shows the app name and no footer', () => {
    provide('app', { name: 'Acme' })
    const el = render(MenuLayout('page'))
    expect(el.querySelector('img.q-menu__logo')).toBeNull()
    expect(el.querySelector('.q-menu__name')?.textContent).toBe('Acme')
    expect(el.querySelector('.q-menu__footer')).toBeNull()
  })

  it('calls currentUser.signOut() from the user menu', () => {
    let signedOut = 0
    provide('currentUser', { name: 'Ada', email: 'a@x', avatar: '', signOut: () => { signedOut++ } })
    const el = render(MenuLayout('page'))
    const button = /** @type {HTMLButtonElement} */ (el.querySelector('.q-user-menu__item'))
    button.click()
    expect(signedOut).toBe(1)
  })
})
