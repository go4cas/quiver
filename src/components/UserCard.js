import { component, html } from '@arrow-js/core'
import { go } from '../framework/router.js'
import { userState } from '../state/userState.js'

const STATUS_CLASSES = {
  online: 'bg-emerald-100 text-emerald-700',
  away:   'bg-amber-100 text-amber-700',
}
const statusClass = (s) => STATUS_CLASSES[s] ?? 'bg-slate-100 text-slate-600'

export const UserCard = component((user) => html`
  <article class="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-shadow hover:shadow-md">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <img src="${user.avatar}" alt="" class="h-10 w-10 rounded-full object-cover" />
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-slate-100">${() => user.name}</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400">${() => user.role}</p>
        </div>
      </div>
      <span class="${() => `rounded-full px-2 py-1 text-xs font-semibold ${statusClass(user.status)}`}">
        ${() => user.status}
      </span>
    </div>

    <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">Team: <span class="font-medium text-slate-700 dark:text-slate-300">${() => user.team}</span></p>

    <p class="mt-3 font-mono text-xs text-slate-300 dark:text-slate-600">component() · stateless · reads global store</p>

    <div class="mt-3 flex gap-2">
      <button
        type="button"
        class="rounded-xl bg-brand/10 px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/20"
        @click="${() => go(`/users/${user.id}`)}"
      >
        View profile
      </button>
      <button
        type="button"
        class="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400"
        @click="${() => userState.removeUser(user.id)}"
      >
        Remove
      </button>
    </div>
  </article>
`)
