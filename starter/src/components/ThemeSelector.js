import { component, html } from '@arrow-js/core'
import { uiState } from '../state/uiState.js'

// Styles: ThemeSelector.css. Each swatch colour is an inline custom property;
// `swatchDark` overrides it in dark mode (for themes whose brand flips).
const THEMES = [
  { id: 'default',   label: 'Default',       swatch: '#f97316' },
  { id: 'mono',      label: 'Monochrome',    swatch: '#0a0a0a', swatchDark: '#fafafa' },
  { id: 'glass',     label: 'Liquid Glass',  swatch: '#7c3aed' },
  { id: 'retro',     label: 'Retro / Y2K',   swatch: '#ec4899' },
  { id: 'brutalist', label: 'Neo Brutalism', swatch: '#facc15' },
]

export const ThemeSelector = component(() => html`
  <div class="q-theme-select" role="group" aria-label="Select theme">
    ${() => THEMES.map((t) =>
      html`
        <button
          type="button"
          class="q-theme-select__swatch"
          style="${`--swatch: ${t.swatch}` + (t.swatchDark ? `; --swatch-dark: ${t.swatchDark}` : '')}"
          title="${t.label}"
          aria-label="${t.label}"
          aria-pressed="${() => uiState.theme === t.id ? 'true' : 'false'}"
          @click="${() => { uiState.theme = t.id }}"
        ></button>
      `.key(t.id)
    )}
  </div>
`)
