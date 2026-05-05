import { html } from '@arrow-js/core'
import { inject } from '../framework/index.js'
import { go } from '../framework/router.js'
import { routerState } from '../state/routerState.js'
import { ThemeSelector } from '../components/ThemeSelector.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { Link } from '../components/Link.js'

const navItem = 'flex items-center rounded-control px-3 py-2 text-sm text-fg-faint transition-colors hover:bg-surface-inset hover:text-fg-soft [&[aria-current=page]]:bg-brand-tint [&[aria-current=page]]:font-semibold [&[aria-current=page]]:text-brand'

export function MenuLayout(content) {
  const app = inject('app', { name: 'Quiver', tagline: '' })
  const currentUser = inject('currentUser', { name: 'Guest', email: 'guest@example.com', avatar: '' })

  return html`
    <div class="grid min-h-screen grid-cols-1 lg:grid-cols-[256px_1fr]">
      <aside class="flex flex-col border-b border-line bg-surface-raised theme-glass:backdrop-blur-md lg:border-b-0 lg:border-r">
        <div class="px-5 py-6">
          <img src="/logo.svg" alt="${app.name}" class="h-9 w-auto" />
          <div class="mt-1 text-sm text-fg-faint">${app.tagline}</div>
        </div>

        <nav class="flex-1 space-y-0.5 px-3">${Link({ to: '/', children: 'Dashboard', class: navItem })} ${Link({ to: '/users', children: 'Team', class: navItem })}</nav>

        <div class="border-t border-line px-5 py-4">
          <p class="font-mono text-xs text-fg-faint">quiver starter · v1.0</p>
        </div>
      </aside>

      <div class="flex min-h-screen flex-col bg-surface">
        <header class="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-raised/80 px-6 py-3 backdrop-blur-sm theme-glass:backdrop-blur-md">
          <span class="font-mono text-xs text-fg-faint">${() => routerState.path}</span>

          <div class="flex items-center gap-3">
            ${ThemeSelector()}
            ${ThemeToggle()}

            <details class="relative" data-testid="user-menu">
              <summary class="flex cursor-pointer list-none items-center gap-2.5 rounded-full border border-line bg-surface-raised py-1 pl-1 pr-3 [&::-webkit-details-marker]:hidden">
                <img src="${currentUser.avatar}" alt="" class="h-6 w-6 rounded-full" />
                <span class="hidden text-sm text-fg-soft sm:block">${currentUser.email}</span>
                <svg class="h-3 w-3 text-fg-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>

              <div class="absolute right-0 top-full z-50 mt-2 w-52 rounded-panel border border-line bg-surface-raised shadow-float">
                <div class="border-b border-line px-4 py-3">
                  <p class="text-sm font-semibold text-fg">${currentUser.name}</p>
                  <p class="mt-0.5 text-xs text-fg-faint">${currentUser.email}</p>
                </div>
                <div class="p-1.5">
                  <button class="w-full rounded-control px-3 py-2 text-left text-sm text-fg-soft hover:bg-surface-inset" @click="${() => go('/login')}">Sign out</button>
                </div>
              </div>
            </details>
          </div>
        </header>

        <main class="flex-1 p-6 lg:p-8">${content}</main>
      </div>
    </div>
  `
}
