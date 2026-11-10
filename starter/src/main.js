import './style.css'
import { provide, initRouter, createApp } from '@go4cas/quiver'
// File-based routes: every file under pages/ is a route (the quiver() plugin in vite.config.js).
import routes, { notFound } from 'quiver:routes'
import { layouts } from './layouts/index.js'
import { LoadingCard } from './components/LoadingCard.js'
import { ErrorCard } from './components/ErrorCard.js'
import aliceAvatar from './assets/avatar-alice.svg'

provide('app', { name: 'Quiver', tagline: 'The Demo Hub' })
provide('currentUser', { name: 'Alice Nkosi', email: 'alice@example.com', avatar: aliceAvatar })

// BASE_URL is Vite's `base` ('/' unless QUIVER_BASE is set, see vite.config.js).
await initRouter({ routes, notFound, base: import.meta.env.BASE_URL })
createApp({
  target: '#app',
  layouts,
  defaultLayout: 'basic',
  loading: LoadingCard,
  error: ({ message }) => ErrorCard(message),
})
