import { component, html, watch } from '@arrow-js/core'
import { useStorage, useMediaQuery } from 'arrow-use'

// Theme switcher recipe: themeState (the chosen theme and mode, persisted),
// ThemeSelector (one swatch per theme) and ThemeToggle (light/dark).
// Styles: theme-switcher.css (classes q-theme-select*, q-mode-toggle*).
// It sets data-theme and data-mode on <html>, which the theme recipe's
// tokens.css and effects.css select on.

/** @typedef {'light' | 'dark'} Mode */
/** @typedef {{ id: string, label: string, swatch: string, swatchDark?: string }} Theme */

/**
 * The themes the selector offers. `/add-theme` adds one line here. Each swatch
 * is an inline custom property; `swatchDark` overrides it in dark mode (for
 * themes whose brand colour flips).
 * @type {Theme[]}
 */
export const THEMES = [
  { id: 'default',   label: 'Default',       swatch: '#f97316' },
  { id: 'mono',      label: 'Monochrome',    swatch: '#0a0a0a', swatchDark: '#fafafa' },
  { id: 'glass',     label: 'Liquid Glass',  swatch: '#7c3aed' },
  { id: 'retro',     label: 'Retro / Y2K',   swatch: '#ec4899' },
  { id: 'brutalist', label: 'Neo Brutalism', swatch: '#facc15' },
]

// Stored as plain strings, not JSON, so the keys stay readable by hand.
/** @type {import('arrow-use').UseStorageOptions<string | null>} */
const RAW = { serializer: { read: (raw) => raw, write: (value) => String(value) } }

// One useStorage instance per key for the whole app. Two instances of one key
// in the same tab don't see each other's writes (the storage event only fires
// in other tabs), so every component reads and writes through these.
const storedTheme = useStorage('ui-theme', /** @type {string | null} */ (null), RAW)
const storedMode = useStorage('ui-mode', /** @type {string | null} */ (null), RAW)
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

export const themeState = {
  /** The active theme id; `'default'` until one is chosen. */
  theme: () => storedTheme.value() ?? 'default',
  /**
   * The active mode. Follows the system setting until the user picks one.
   * @returns {Mode}
   */
  mode: () => {
    const stored = storedMode.value()
    if (stored === 'light' || stored === 'dark') return stored
    return prefersDark.matches() ? 'dark' : 'light'
  },
  /** @param {string} id */
  setTheme: (id) => storedTheme.set(id),
  /** @param {Mode} mode */
  setMode: (mode) => storedMode.set(mode),
  toggleMode: () => storedMode.set(themeState.mode() === 'light' ? 'dark' : 'light'),
}

if (typeof document !== 'undefined') {
  watch(() => {
    document.documentElement.dataset.theme = themeState.theme()
    document.documentElement.dataset.mode = themeState.mode()
  })
}

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
          aria-pressed="${() => themeState.theme() === t.id ? 'true' : 'false'}"
          @click="${() => themeState.setTheme(t.id)}"
        ></button>
      `.key(t.id)
    )}
  </div>
`)

export const ThemeToggle = component(() => html`
  <button
    type="button"
    aria-label="Toggle light/dark mode"
    class="q-mode-toggle"
    @click="${() => themeState.toggleMode()}"
  >
    <span class="q-mode-toggle__thumb"></span>
  </button>
`)
