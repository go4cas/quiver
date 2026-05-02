import { reactive, watch } from '@arrow-js/core'

export const uiState = reactive({
  theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
})

// Keep the document theme attribute in sync with uiState.theme.
// watch() re-runs this side effect whenever uiState.theme changes —
// components only need to mutate state; DOM sync is handled here.
watch(() => {
  document.documentElement.dataset.theme = uiState.theme
})
