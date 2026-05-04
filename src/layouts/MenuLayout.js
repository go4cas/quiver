import { html } from '@arrow-js/core'
import { inject } from '../framework/index.js'
import { go } from '../framework/router.js'
import { routerState } from '../state/routerState.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { Link } from '../components/Link.js'

const navItem = 'flex items-center rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 [&[aria-current=page]]:bg-brand/20 [&[aria-current=page]]:font-semibold [&[aria-current=page]]:text-brand'

export function MenuLayout(content) {
  const app = inject('app', { name: 'Quiver', tagline: '' })
  const currentUser = inject('currentUser', { name: 'Guest', email: 'guest@example.com', avatar: '' })

  return html`
    <div class="grid min-h-screen grid-cols-1 lg:grid-cols-[256px_1fr]">
      <aside class="flex flex-col border-b border-slate-800 bg-slate-900 lg:border-b-0 lg:border-r lg:border-slate-800">
        <div class="px-5 py-6">
          <img src="/logo.svg" alt="${app.name}" class="h-9 w-auto" />
          <div class="mt-1 text-sm text-slate-500">${app.tagline}</div>
        </div>

        <nav class="flex-1 space-y-0.5 px-3">${Link({ to: '/', children: 'Dashboard', class: navItem })} ${Link({ to: '/users', children: 'Team', class: navItem })}</nav>

        <div class="border-t border-slate-800 px-5 py-4">
          <p class="font-mono text-xs text-slate-600">quiver starter · v1.0</p>
        </div>
      </aside>

      <div class="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
        <header class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-6 py-3 backdrop-blur-sm">
          <span class="font-mono text-xs text-slate-400 dark:text-slate-500">${() => routerState.path}</span>

          <div class="flex items-center gap-3">
            ${ThemeToggle()}

            <details class="relative" data-testid="user-menu">
              <summary class="flex cursor-pointer list-none items-center gap-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 pl-1 pr-3 [&::-webkit-details-marker]:hidden">
                <img src="${currentUser.avatar}" alt="" class="h-6 w-6 rounded-full" />
                <span class="hidden text-sm text-slate-600 dark:text-slate-300 sm:block">${currentUser.email}</span>
                <svg class="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>

              <div class="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
                <div class="border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                  <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">${currentUser.name}</p>
                  <p class="mt-0.5 text-xs text-slate-500">${currentUser.email}</p>
                </div>
                <div class="p-1.5">
                  <button class="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" @click="${() => go('/login')}">Sign out</button>
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
