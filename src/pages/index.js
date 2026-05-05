import { html } from '@arrow-js/core'
import { Counter } from '../components/Counter.js'
import { userState } from '../state/userState.js'

export const meta = {
  layout: 'menu',
  title: 'Dashboard',
}

function HomePage() {
  return html`
    <div class="space-y-10">
      <div>
        <h1 class="text-2xl font-bold text-fg">Dashboard</h1>
        <p class="mt-1 text-sm text-fg-soft">Two scopes side by side — global store state and local component state.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="rounded-full bg-brand-tint px-2.5 py-0.5 font-mono text-xs text-brand">reactive()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">watch()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">onCleanup()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">component()</span>
        </div>
      </div>

      <section class="space-y-3">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-fg-faint">Live metrics</h2>
            <span class="rounded-md bg-violet-100 px-1.5 py-0.5 font-mono text-xs text-violet-600 dark:bg-violet-950 dark:text-violet-400">global store</span>
          </div>
          <p class="mt-1 text-xs text-fg-faint">Read from <code class="font-mono">userState</code> — shared across all routes. Navigate to Team, add or remove a member, and these numbers update instantly.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div data-testid="metric-card" class="rounded-panel border border-line bg-surface-raised p-5 shadow-panel theme-glass:backdrop-blur-md theme-brutalist:border-2">
            <p class="text-sm font-medium text-fg-soft">Team members</p>
            <p class="mt-2 text-4xl font-bold text-fg">${() => userState.users.length}</p>
            <p class="mt-1 font-mono text-xs text-violet-500 dark:text-violet-400">userState.users.length</p>
          </div>
          <div data-testid="metric-card" class="rounded-panel border border-line bg-surface-raised p-5 shadow-panel theme-glass:backdrop-blur-md theme-brutalist:border-2">
            <p class="text-sm font-medium text-fg-soft">Online</p>
            <p class="mt-2 text-4xl font-bold text-fg">${() => userState.users.filter((u) => u.status === 'online').length}</p>
            <p class="mt-1 font-mono text-xs text-fg-faint">derived · filter()</p>
          </div>
          <div data-testid="metric-card" class="rounded-panel border border-line bg-surface-raised p-5 shadow-panel theme-glass:backdrop-blur-md theme-brutalist:border-2">
            <p class="text-sm font-medium text-fg-soft">Away</p>
            <p class="mt-2 text-4xl font-bold text-fg">${() => userState.users.filter((u) => u.status === 'away').length}</p>
            <p class="mt-1 font-mono text-xs text-fg-faint">derived · filter()</p>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-fg-faint">Interactive components</h2>
            <span class="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-xs text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">local state</span>
          </div>
          <p class="mt-1 text-xs text-fg-faint">Each Counter holds its own count — isolated per instance, invisible to the rest of the app. State is lost when the component unmounts (navigating away resets it).</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">${Counter({ label: 'Tickets Resolved' })} ${Counter({ label: 'Replies Drafted' })}</div>
      </section>
    </div>
  `
}

export default HomePage
