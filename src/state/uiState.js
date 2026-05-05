import { reactive, watch } from '@arrow-js/core'

export const uiState = reactive({
  theme: localStorage.getItem('ui-theme') || 'default',
  mode:  localStorage.getItem('ui-mode')  || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
})

watch(() => {
  document.documentElement.dataset.theme = uiState.theme
  document.documentElement.dataset.mode  = uiState.mode
  localStorage.setItem('ui-theme', uiState.theme)
  localStorage.setItem('ui-mode',  uiState.mode)
})
