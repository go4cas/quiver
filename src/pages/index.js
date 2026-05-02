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
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Two scopes side by side — global store state and local component state.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-xs text-brand">reactive()</span>
          <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">watch()</span>
          <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">onCleanup()</span>
          <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">component()</span>
        </div>
      </div>

      <section class="space-y-3">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Live metrics</h2>
            <span class="rounded-md bg-violet-100 dark:bg-violet-950 px-1.5 py-0.5 font-mono text-xs text-violet-600 dark:text-violet-400">global store</span>
          </div>
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Read from <code class="font-mono">userState</code> — shared across all routes. Navigate to Team, add or remove a member, and these numbers update instantly.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Team members</p>
            <p class="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">${() => userState.users.length}</p>
            <p class="mt-1 font-mono text-xs text-violet-500 dark:text-violet-400">userState.users.length</p>
          </div>
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Online</p>
            <p class="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">${() => userState.users.filter((u) => u.status === 'online').length}</p>
            <p class="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">derived · filter()</p>
          </div>
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Away</p>
            <p class="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">${() => userState.users.filter((u) => u.status === 'away').length}</p>
            <p class="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">derived · filter()</p>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Interactive components</h2>
            <span class="rounded-md bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">local state</span>
          </div>
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Each Counter holds its own count — isolated per instance, invisible to the rest of the app. State is lost when the component unmounts (navigating away resets it).</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">${Counter({ label: 'Tickets Resolved' })} ${Counter({ label: 'Replies Drafted' })}</div>
      </section>
    </div>
  `
}

export default HomePage
