import { component, html } from '@arrow-js/core'
import { go } from '../framework/router.js'
import { userState } from '../state/userState.js'

const STATUS_CLASSES = {
  online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  away:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
}
const statusClass = (s) => STATUS_CLASSES[s] ?? 'bg-surface-inset text-fg-soft'

export const UserCard = component((user) => html`
  <article class="flex flex-col rounded-panel border border-line bg-surface-raised p-5 shadow-panel transition-shadow hover:shadow-float theme-glass:backdrop-blur-md theme-brutalist:border-2">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <img src="${user.avatar}" alt="" class="h-10 w-10 rounded-full object-cover" />
        <div>
          <h3 class="font-semibold text-fg">${() => user.name}</h3>
          <p class="text-sm text-fg-soft">${() => user.role}</p>
        </div>
      </div>
      <span class="${() => `rounded-full px-2 py-1 text-xs font-semibold ${statusClass(user.status)}`}">
        ${() => user.status}
      </span>
    </div>

    <p class="mt-4 text-sm text-fg-soft">Team: <span class="font-medium text-fg">${() => user.team}</span></p>

    <p class="mt-3 font-mono text-xs text-fg-faint">component() · stateless · reads global store</p>

    <div class="mt-3 flex gap-2">
      <button
        type="button"
        class="rounded-control bg-brand-tint px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white"
        @click="${() => go(`/users/${user.id}`)}"
      >
        View profile
      </button>
      <button
        type="button"
        class="rounded-control bg-surface-inset px-3 py-2 text-sm font-semibold text-fg-soft hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        @click="${() => userState.removeUser(user.id)}"
      >
        Remove
      </button>
    </div>
  </article>
`)
