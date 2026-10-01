import { component, html } from '@arrow-js/core'
import { go } from '../framework/router.js'
import { userState } from '../state/userState.js'

/** @typedef {import('../state/userState.js').User} User */

/** @type {Record<string, string>} */
const STATUS_CLASSES = {
  online: 'bg-success-tint text-success',
  away:   'bg-warning-tint text-warning',
}
const statusClass = /** @param {string} s */ (s) => STATUS_CLASSES[s] ?? 'bg-surface-inset text-fg-soft'

export const UserCard = component(/** @param {User} user */ (user) => html`
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
        class="rounded-control bg-surface-inset px-3 py-2 text-sm font-semibold text-fg-soft hover:bg-error-tint hover:text-error"
        @click="${() => userState.removeUser(user.id)}"
      >
        Remove
      </button>
    </div>
  </article>
`)
