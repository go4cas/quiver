import { html } from '@arrow-js/core'
import { inject, go, useRoute } from '@go4cas/quiver'
import { ThemeSelector }  from '../components/ThemeSelector.js'
import { ThemeToggle }    from '../components/ThemeToggle.js'
import { ToastContainer } from '../components/ToastContainer.js'
import { Link }           from '../components/Link.js'

// Styles: MenuLayout.css (classes q-menu, q-menu__*, q-user-menu, q-user-menu__*).
const navItem = 'q-menu__nav-link'

/** @param {any} content */
export function MenuLayout(content) {
  const app = inject('app', { name: 'Quiver', tagline: '' })
  const currentUser = inject('currentUser', { name: 'Guest', email: 'guest@example.com', avatar: '' })
  const route = useRoute()

  return html`
    <div class="q-menu">
      <aside class="q-menu__sidebar q-sidebar">
        <div class="q-menu__brand">
          <img src="/logo.svg" alt="${app.name}" class="q-menu__logo" />
          <div class="q-menu__tagline">${app.tagline}</div>
        </div>

        <nav class="q-menu__nav">${Link({ to: '/', children: 'Dashboard', class: navItem })} ${Link({ to: '/users', children: 'Team', class: navItem })} ${Link({ to: '/posts', children: 'Posts', class: navItem })} ${Link({ to: '/toasts', children: 'Toasts', class: navItem })}</nav>

        <div class="q-menu__footer">
          <p>quiver starter</p>
        </div>
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
                  <button class="q-user-menu__item" @click="${() => go('/login')}">Sign out</button>
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
