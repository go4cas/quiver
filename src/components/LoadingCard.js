import { html } from '@arrow-js/core'

// Styles: views.css (classes q-view, q-view__*).
export function LoadingCard() {
  return html`
    <div class="q-view">
      <div class="q-view__card q-panel">
        <div class="q-view__title">Loading…</div>
        <p class="q-view__text">Resolving the current route.</p>
      </div>
    </div>
  `
}
