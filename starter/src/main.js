import './style.css'
import { provide, initRouter, createApp } from '@go4cas/quiver'
// File-based routes: every file under pages/ is a route (the quiver() plugin in vite.config.js).
import routes, { notFound } from 'quiver:routes'
// Imported first so the stored theme is on <html> before anything renders.
import './quiver/theme-switcher/theme-switcher.js'
import { layouts } from './layouts/index.js'
import { LoadingView, ErrorView } from './quiver/views/views.js'
import aliceAvatar from './assets/avatar-alice.svg'

// What MenuLayout shows (src/quiver/layouts/README.md).
provide('app', { name: 'Quiver', tagline: 'The Demo Hub', logo: '/logo.svg', footer: 'quiver starter' })
provide('nav', [
  { to: '/', label: 'Dashboard' },
  { to: '/users', label: 'Team' },
  { to: '/posts', label: 'Posts' },
  { to: '/toasts', label: 'Toasts' },
])
// A fixed demo identity: the starter has no sessions. A real app provides the
// signed-in user from its own store and a signOut() that ends the server session
// (src/quiver/layouts/README.md, "Sign-out").
provide('currentUser', { name: 'Alice Nkosi', email: 'alice@example.com', avatar: aliceAvatar })

// BASE_URL is Vite's `base` ('/' unless QUIVER_BASE is set, see vite.config.js).
await initRouter({ routes, notFound, base: import.meta.env.BASE_URL })
createApp({
  target: '#app',
  layouts,
  defaultLayout: 'basic',
  loading: LoadingView,
  error: ErrorView,
})
