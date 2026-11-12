import { component, html, onCleanup, watch } from '@arrow-js/core'
import { hmrState } from '../composables/hmrState.js'

// Styles: Counter.css, plus the shared card/badge/btn classes in app.css.
export const Counter = component(/** @param {{ label: string }} props */ (props) => {
  const state = hmrState(`counter-${props.label}`, { count: 0 })

  const [, stopWatch] = watch(() => {
    if (state.count > 0 && state.count % 10 === 0) {
      console.log(`[Counter] "${props.label}" milestone: ${state.count}`)
    }
  })

  onCleanup(stopWatch)

  return html`
    <article class="card counter q-panel">
      <div class="card__head">
        <p class="counter__label">${() => props.label}</p>
        <span class="badge">component()</span>
      </div>

      <p class="counter__value">${() => state.count}</p>
      <p class="counter__note mono-note">watch() logs every 10th increment</p>

      <div class="counter__actions">
        <button
          type="button"
          class="btn"
          data-variant="primary"
          @click="${() => state.count++}"
        >
          Increment
        </button>
        <button
          type="button"
          class="btn"
          data-variant="secondary"
          @click="${() => (state.count = 0)}"
        >
          Reset
        </button>
      </div>
    </article>
  `
})
