import { html } from '@arrow-js/core'

// Views recipe, the loading view. In an app it is views/loading.js, which
// createApp(app, options) uses while a route loads. Styles: views.css (q-view*).

/** Shown while a route's page module loads. */
export default function LoadingView() {
  return html`
    <div class="q-view">
      <div class="q-view__card q-panel" role="status">
        <div class="q-view__title">Loading…</div>
        <p class="q-view__text">Resolving the current route.</p>
      </div>
    </div>
  `
}
