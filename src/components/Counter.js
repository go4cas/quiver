import { component, html, onCleanup, watch } from '@arrow-js/core'
import { hmrState } from '../utils/hmrState.js'

export const Counter = component((props) => {
  // hmrState preserves count across Vite hot-reloads during development.
  const state = hmrState(`counter-${props.label}`, { count: 0 })

  // watch() runs the effect immediately, then re-runs whenever state.count changes.
  // The second element of the returned tuple is a stop function.
  const [, stopWatch] = watch(() => {
    if (state.count > 0 && state.count % 10 === 0) {
      console.log(`[Counter] "${props.label}" milestone: ${state.count}`)
    }
  })

  // onCleanup fires when this component instance unmounts (e.g. route change).
  onCleanup(stopWatch)

  return html`
    <article class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">${() => props.label}</p>
        <span class="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-400 dark:text-slate-500">component()</span>
      </div>

      <p class="mt-3 text-4xl font-bold text-slate-900 dark:text-slate-100">${() => state.count}</p>
      <p class="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">watch() logs every 10th increment</p>

      <div class="mt-5 flex gap-2">
        <button
          type="button"
          class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          @click="${() => state.count++}"
        >
          Increment
        </button>
        <button
          type="button"
          class="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          @click="${() => (state.count = 0)}"
        >
          Reset
        </button>
      </div>
    </article>
  `
})
