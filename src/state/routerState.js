import { reactive } from '@arrow-js/core'

export const routerState = reactive({
  path: window.location.pathname || '/',
  params: {},
  page: null,
  layout: 'basic',
  status: 'idle',
  error: '',
  meta: {},
})
