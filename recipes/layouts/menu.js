import { html } from '@arrow-js/core'
import { inject, go, url, useRoute } from '@go4cas/quiver'
import { Link } from '../link/link.js'
import { ToastContainer } from '../toasts/toasts.js'
import { ThemeSelector, ThemeToggle } from '../theme-switcher/theme-switcher.js'

// Layouts recipe, the menu layout: sidebar + header. In an app it is
// layouts/menu.js, so pages pick it with `meta: { layout: 'menu' }`. Styles:
// layouts.css (classes q-menu*, q-user-menu*). Mounts the toast container.
//
// It reads what it shows from context keys, which app.config.js provides by
// name (or provide() in a manual setup), so apps edit their config, not this file:
//   'app'         { name, tagline?, logo?, footer? }   logo is a base-relative path
//   'nav'         [{ to, label }]                      sidebar links; built from pages' meta.nav
//   'currentUser' { name, email, avatar, signOut? }    signOut defaults to go('/login'), which ends no session (README: Sign-out)

/** @typedef {{ name: string, tagline?: string, logo?: string, footer?: string }} AppInfo */
/** @typedef {{ to: string, label: string }} NavItem */
/** @typedef {{ name: string, email: string, avatar: string, signOut?: () => void }} CurrentUser */

/** @param {any} content */
export default function MenuLayout(content) {
  const app = inject('app', /** @type {AppInfo} */ ({ name: 'Quiver' }))
  const nav = inject('nav', /** @type {NavItem[]} */ ([]))
  const currentUser = inject('currentUser', /** @type {CurrentUser} */ ({ name: 'Guest', email: 'guest@example.com', avatar: '' }))
  const signOut = currentUser.signOut ?? (() => go('/login'))
  const route = useRoute()

  return html`
    <div class="q-menu">
      <aside class="q-menu__sidebar q-sidebar">
        <div class="q-menu__brand">
          ${() => app.logo
            ? html`<img src="${url(app.logo)}" alt="${app.name}" class="q-menu__logo" />`
            : html`<span class="q-menu__name q-accent">${app.name}</span>`}
          <div class="q-menu__tagline">${app.tagline ?? ''}</div>
        </div>

        <nav class="q-menu__nav">${() => nav.map((item) =>
          Link({ to: item.to, children: item.label, class: 'q-menu__nav-link' }).key(item.to)
        )}</nav>

        ${() => app.footer
          ? html`<div class="q-menu__footer"><p>${app.footer}</p></div>`
          : html``}
      </aside>

      <div class="q-menu__body">
        <header class="q-menu__header q-header">
          <span class="q-menu__path">${() => route.path()}</span>

          <div class="q-menu__actions">
            ${ThemeSelector()}
            ${ThemeToggle()}

            <details class="q-user-menu" data-testid="user-menu">
              <summary class="q-user-menu__summary">
                <img src="${currentUser.avatar}" alt="" class="q-user-menu__avatar" />
                <span class="q-user-menu__email">${currentUser.email}</span>
                <svg class="q-user-menu__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>

              <div class="q-user-menu__panel q-panel">
                <div class="q-user-menu__identity">
                  <p class="q-user-menu__name">${currentUser.name}</p>
                  <p class="q-user-menu__meta">${currentUser.email}</p>
                </div>
                <div class="q-user-menu__items">
                  <button class="q-user-menu__item" @click="${() => signOut()}">Sign out</button>
                </div>
              </div>
            </details>
          </div>
        </header>

        <main class="q-menu__content">${content}</main>
      </div>
    </div>
    ${ToastContainer()}
  `
}
