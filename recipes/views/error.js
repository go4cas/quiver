import { html } from '@arrow-js/core'
import { url } from '@go4cas/quiver'

// Views recipe, the error view. In an app it is views/error.js, which
// createApp(app, options) uses for guard, load and render errors. Styles:
// views.css (q-view*; data-tone="error" on the card).

/**
 * Shown when a guard, a page load or a render throws. `retry()` re-resolves
 * the current route; the home link is a plain anchor, so it works even when
 * the router is in a bad state.
 * @param {{ message: string, error?: unknown, retry?: () => void }} props
 */
export default function ErrorView({ message, retry }) {
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
