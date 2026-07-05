import { component, html, onCleanup, watch } from '@arrow-js/core'
import { hmrState } from '../utils/hmrState.js'

export const Counter = component(/** @param {{ label: string }} props */ (props) => {
  const state = hmrState(`counter-${props.label}`, { count: 0 })

  const [, stopWatch] = watch(() => {
    if (state.count > 0 && state.count % 10 === 0) {
      console.log(`[Counter] "${props.label}" milestone: ${state.count}`)
    }
  })

  onCleanup(stopWatch)

  return html`
    <article class="rounded-panel border border-line bg-surface-raised p-5 shadow-panel theme-glass:backdrop-blur-md theme-brutalist:border-2">
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-medium text-fg-soft">${() => props.label}</p>
        <span class="shrink-0 rounded-full bg-surface-inset px-2 py-0.5 font-mono text-xs text-fg-faint">component()</span>
      </div>

      <p class="mt-3 text-4xl font-bold text-fg">${() => state.count}</p>
      <p class="mt-1 font-mono text-xs text-fg-faint">watch() logs every 10th increment</p>

      <div class="mt-5 flex gap-2">
        <button
          type="button"
          class="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover shadow-panel theme-brutalist:border-2 theme-brutalist:border-fg"
          @click="${() => state.count++}"
        >
          Increment
        </button>
        <button
          type="button"
          class="rounded-control bg-surface-inset px-4 py-2 text-sm font-semibold text-fg-soft hover:bg-line"
          @click="${() => (state.count = 0)}"
        >
          Reset
        </button>
      </div>
    </article>
  `
})
