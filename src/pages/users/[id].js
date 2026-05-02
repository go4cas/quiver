import { html } from '@arrow-js/core'
import { userState } from '../../state/userState.js'
import { useRoute } from '../../composables/useRoute.js'
import { useRouter } from '../../composables/useRouter.js'

export const meta = {
  layout: 'menu',
  title: 'Profile',
}

function UserDetailPage() {
  const route = useRoute()
  const router = useRouter()

  return html`
    <div class="space-y-6">

      <button
        type="button"
        class="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        @click="${() => router.go('/users')}"
      >
        ← Back to team
      </button>

      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile</h1>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-xs text-brand">/users/:id</span>
          <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">useRoute()</span>
          <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">useRouter()</span>
        </div>
      </div>

      ${() => {
        const user = userState.users.find((u) => String(u.id) === String(route.params().id))

        if (!user) {
          return html`
            <div class="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-6">
              <h2 class="font-semibold text-amber-800 dark:text-amber-400">User not found</h2>
              <p class="mt-1 text-sm text-amber-700 dark:text-amber-500">No user exists for ID <code class="font-mono">${() => route.params().id}</code>.</p>
            </div>
          `
        }

        // All fields wrapped in () => so they stay reactive to userState mutations.
        return html`
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div class="flex items-center gap-4">
              <img src="${user.avatar}" alt="" class="h-16 w-16 rounded-full object-cover" />
              <div>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100">${() => user.name}</h2>
                <p class="text-slate-500 dark:text-slate-400">${() => user.role}</p>
              </div>
            </div>

            <dl class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Team</dt>
                <dd class="mt-1.5 font-semibold text-slate-900 dark:text-slate-100">${() => user.team}</dd>
              </div>
              <div class="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Status</dt>
                <dd class="mt-1.5 font-semibold text-slate-900 dark:text-slate-100">${() => user.status}</dd>
              </div>
              <div class="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Route param · :id</dt>
                <dd class="mt-1.5 font-mono text-sm text-brand">${() => route.params().id}</dd>
              </div>
            </dl>
          </div>
        `
      }}

    </div>
  `
}

export default UserDetailPage
