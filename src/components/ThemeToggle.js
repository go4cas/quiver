import { component, html } from '@arrow-js/core'
import { uiState } from '../state/uiState.js'

// ThemeToggle only mutates state — the DOM side effect (dataset.theme) is
// handled by the watch() in uiState.js, keeping concerns separated.
export const ThemeToggle = component(() => html`
  <button
    type="button"
    aria-label="Toggle theme"
    class="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-slate-200 dark:bg-brand transition-colors duration-300"
    @click="${() => { uiState.theme = uiState.theme === 'light' ? 'dark' : 'light' }}"
  >
    <span class="inline-block h-4 w-4 translate-x-0.5 dark:translate-x-5 transform rounded-full bg-white shadow-sm transition-transform duration-300"></span>
  </button>
`)
