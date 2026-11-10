import { html } from '@arrow-js/core'
import { url } from '@go4cas/quiver'

// Loading and error views recipe, for createApp({ loading, error }).
// Styles: views.css (classes q-view, q-view__*; data-tone="error" on the card).
//
//   createApp({ target: '#app', loading: LoadingView, error: ErrorView, … })

/** Shown while a route's page module loads. */
export function LoadingView() {
  return html`
    <div class="q-view">
      <div class="q-view__card q-panel" role="status">
        <div class="q-view__title">Loading…</div>
        <p class="q-view__text">Resolving the current route.</p>
      </div>
    </div>
  `
}

/**
 * Shown when a guard, a page load or a render throws. `retry()` re-resolves
 * the current route; the home link is a plain anchor, so it works even when
 * the router is in a bad state.
 * @param {{ message: string, error?: unknown, retry?: () => void }} props
 */
export function ErrorView({ message, retry }) {
  return html`
    <div class="q-view">
      <div class="q-view__card q-panel" data-tone="error" role="alert">
        <div class="q-view__title">Something went wrong</div>
        <p class="q-view__text">${message || 'The page could not be shown.'}</p>
        <div class="q-view__actions">
          ${() => retry
            ? html`<button type="button" class="q-view__action" @click="${() => retry()}">Try again</button>`
            : html``}
          <a class="q-view__action" data-variant="secondary" href="${url('/')}">Go home</a>
        </div>
      </div>
    </div>
  `
}
