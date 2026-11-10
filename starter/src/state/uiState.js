import { reactive, watch } from '@arrow-js/core'

// localStorage access can throw (blocked cookies in embedded iframes, strict
// privacy modes). Fall back to defaults instead of crashing at import time.
/** @param {string} key */
function readStored(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

export const uiState = reactive({
  theme: readStored('ui-theme') || 'default',
  mode:  readStored('ui-mode')  || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
})

watch(() => {
  document.documentElement.dataset.theme = uiState.theme
  document.documentElement.dataset.mode  = uiState.mode
  try {
    localStorage.setItem('ui-theme', uiState.theme)
    localStorage.setItem('ui-mode',  uiState.mode)
  } catch { /* storage unavailable — theme still applies, just won't persist */ }
})
