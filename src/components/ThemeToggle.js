import { component, html } from '@arrow-js/core'
import { uiState } from '../state/uiState.js'

export const ThemeToggle = component(() => html`
  <button
    type="button"
    aria-label="Toggle light/dark mode"
    class="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-surface-inset dark:bg-brand transition-colors duration-300"
    @click="${() => { uiState.mode = uiState.mode === 'light' ? 'dark' : 'light' }}"
  >
    <span class="inline-block h-4 w-4 translate-x-0.5 dark:translate-x-5 transform rounded-full bg-surface-raised shadow-sm transition-transform duration-300"></span>
  </button>
`)
