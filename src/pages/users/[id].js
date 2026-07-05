import { html } from '@arrow-js/core'
import { userState } from '../../state/userState.js'
import { useRoute } from '../../composables/useRoute.js'
import { useRouter } from '../../composables/useRouter.js'
import { useMeta } from '../../framework/index.js'

export const meta = {
  layout: 'menu',
  title: 'Profile',
}

function UserDetailPage() {
  const route = useRoute()
  const router = useRouter()

  // Reactive document title — updates with the route param and user data.
  // The router clears this watcher automatically on the next navigation.
  useMeta({
    title: () => {
      const user = userState.users.find((u) => String(u.id) === String(route.params().id))
      return user ? `${user.name} — Profile` : 'Profile'
    },
  })

  return html`
    <div class="space-y-6">

      <button
        type="button"
        class="text-sm text-fg-faint hover:text-fg-soft"
        @click="${() => router.go('/users')}"
      >
        ← Back to team
      </button>

      <div>
        <h1 class="text-2xl font-bold text-fg">Profile</h1>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="rounded-full bg-brand-tint px-2.5 py-0.5 font-mono text-xs text-brand">/users/:id</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">useRoute()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">useRouter()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">useMeta()</span>
        </div>
      </div>

      ${() => {
        const user = userState.users.find((u) => String(u.id) === String(route.params().id))

        if (!user) {
          return html`
            <div class="rounded-panel border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
              <h2 class="font-semibold text-amber-800 dark:text-amber-400">User not found</h2>
              <p class="mt-1 text-sm text-amber-700 dark:text-amber-500">No user exists for ID <code class="font-mono">${() => route.params().id}</code>.</p>
            </div>
          `
        }

        return html`
          <div class="rounded-panel border border-line bg-surface-raised p-6 shadow-panel theme-glass:backdrop-blur-md theme-brutalist:border-2">
            <div class="flex items-center gap-4">
              <img src="${user.avatar}" alt="" class="h-16 w-16 rounded-full object-cover" />
              <div>
                <h2 class="text-2xl font-bold text-fg">${() => user.name}</h2>
                <p class="text-fg-soft">${() => user.role}</p>
              </div>
            </div>

            <dl class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="rounded-control bg-surface-inset p-4">
                <dt class="text-xs font-semibold uppercase tracking-wide text-fg-faint">Team</dt>
                <dd class="mt-1.5 font-semibold text-fg">${() => user.team}</dd>
              </div>
              <div class="rounded-control bg-surface-inset p-4">
                <dt class="text-xs font-semibold uppercase tracking-wide text-fg-faint">Status</dt>
                <dd class="mt-1.5 font-semibold text-fg">${() => user.status}</dd>
              </div>
              <div class="rounded-control bg-surface-inset p-4">
                <dt class="text-xs font-semibold uppercase tracking-wide text-fg-faint">Route param · :id</dt>
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
