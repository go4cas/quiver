import { html, nextTick } from '@arrow-js/core'
import { UserCard } from '../../components/UserCard.js'
import { userState } from '../../state/userState.js'

export const meta = {
  layout: 'menu',
  title: 'Team',
}

function UsersPage() {
  return html`
    <div class="space-y-10">

      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Team
            <span class="ml-2 text-lg font-normal text-slate-400 dark:text-slate-500">${() => userState.users.length}</span>
          </h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add and remove members to see the reactive array update live.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span class="rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-xs text-brand">file-based routing</span>
            <span class="rounded-full bg-violet-100 dark:bg-violet-950 px-2.5 py-0.5 font-mono text-xs text-violet-600 dark:text-violet-400">global store</span>
            <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">reactive arrays</span>
            <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">.key()</span>
            <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">nextTick()</span>
          </div>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          @click="${async () => {
            userState.addUser({ name: 'New Member', role: 'Analyst', team: 'Insights' })
            await nextTick()
          }}"
        >
          Add member
        </button>
      </div>

      <section class="space-y-3">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Team member cards</h2>
            <span class="rounded-md bg-sky-100 dark:bg-sky-950 px-1.5 py-0.5 font-mono text-xs text-sky-600 dark:text-sky-400">nested components</span>
          </div>
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Each card is a <code class="font-mono">component()</code> instance rendered by this page.
            <code class="font-mono">.key(user.id)</code> gives each instance stable DOM identity so Arrow re-uses
            existing nodes instead of destroying and recreating them on every state change.
          </p>
        </div>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          ${() => userState.users.map((user) => UserCard(user).key(user.id))}
        </div>
      </section>

    </div>
  `
}

export default UsersPage
