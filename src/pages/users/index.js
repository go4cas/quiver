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
          <h1 class="text-2xl font-bold text-fg">
            Team
            <span class="ml-2 text-lg font-normal text-fg-faint">${() => userState.users.length}</span>
          </h1>
          <p class="mt-1 text-sm text-fg-soft">
            Add and remove members to see the reactive array update live.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span class="rounded-full bg-brand-tint px-2.5 py-0.5 font-mono text-xs text-brand">file-based routing</span>
            <span class="rounded-full bg-violet-100 px-2.5 py-0.5 font-mono text-xs text-violet-600 dark:bg-violet-950 dark:text-violet-400">global store</span>
            <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">reactive arrays</span>
            <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">.key()</span>
            <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">nextTick()</span>
          </div>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover shadow-panel theme-brutalist:border-2 theme-brutalist:border-fg"
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
            <h2 class="text-xs font-semibold uppercase tracking-wider text-fg-faint">Team member cards</h2>
            <span class="rounded-md bg-sky-100 px-1.5 py-0.5 font-mono text-xs text-sky-600 dark:bg-sky-950 dark:text-sky-400">nested components</span>
          </div>
          <p class="mt-1 text-xs text-fg-faint">
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
