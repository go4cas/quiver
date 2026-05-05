import { component, html } from '@arrow-js/core'
import { uiState } from '../state/uiState.js'

const THEMES = [
  { id: 'default',   label: 'Default',       bg: 'bg-[#f97316]' },
  { id: 'mono',      label: 'Monochrome',    bg: 'bg-[#0a0a0a] dark:bg-[#fafafa]' },
  { id: 'glass',     label: 'Liquid Glass',  bg: 'bg-[#7c3aed]' },
  { id: 'retro',     label: 'Retro / Y2K',   bg: 'bg-[#ec4899]' },
  { id: 'brutalist', label: 'Neo Brutalism',  bg: 'bg-[#facc15]' },
]

export const ThemeSelector = component(() => html`
  <div class="flex items-center gap-1.5" role="group" aria-label="Select theme">
    ${() => THEMES.map((t) =>
      html`
        <button
          type="button"
          title="${t.label}"
          aria-label="${t.label}"
          aria-pressed="${() => uiState.theme === t.id ? 'true' : 'false'}"
          class="${() => [
            t.bg,
            'h-4 w-4 rounded-full border-2 transition-all duration-150',
            uiState.theme === t.id
              ? 'scale-125 border-fg shadow-sm'
              : 'border-line hover:scale-110',
          ].join(' ')}"
          @click="${() => { uiState.theme = t.id }}"
        ></button>
      `.key(t.id)
    )}
  </div>
`)
