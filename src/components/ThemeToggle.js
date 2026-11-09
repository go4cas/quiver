import { component, html } from '@arrow-js/core'
import { uiState } from '../state/uiState.js'

// Styles: ThemeToggle.css (classes q-mode-toggle, q-mode-toggle__thumb).
export const ThemeToggle = component(() => html`
  <button
    type="button"
    aria-label="Toggle light/dark mode"
    class="q-mode-toggle"
    @click="${() => { uiState.mode = uiState.mode === 'light' ? 'dark' : 'light' }}"
  >
    <span class="q-mode-toggle__thumb"></span>
  </button>
`)
