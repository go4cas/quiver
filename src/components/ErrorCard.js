import { html } from '@arrow-js/core'
import { go } from '../framework/router.js'

// Styles: views.css (classes q-view, q-view__*; data-tone="error" on the card).
export function ErrorCard(message = 'Something went wrong.') {
  return html`
    <div class="q-view">
      <div class="q-view__card q-panel" data-tone="error">
        <div class="q-view__title">Route error</div>
        <p class="q-view__text">${message}</p>
        <button
          type="button"
          class="q-view__action"
          @click="${() => go('/')}"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  `
}
